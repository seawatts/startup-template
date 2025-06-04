import { readFile, writeFile } from 'node:fs/promises';

import {
  allowedPatterns,
  obfuscationPatterns,
  packageSignatures,
} from './constants';
import { formatCode, getPatternWeight, isAllowedBase64 } from './utils';

export async function analyzeFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    const formattedContent = await formatCode(content);
    const lines = formattedContent.split('\n');
    const matches = [];
    let suspiciousScore = 0;
    const detectedPackages = new Set();

    if (filePath.endsWith('.map') || filePath.includes('vendor')) {
      return null;
    }

    // First detect any known packages
    for (const [packageName, signature] of packageSignatures) {
      if (signature.test(formattedContent)) {
        detectedPackages.add(packageName);
      }
    }

    let shouldStoreFormattedCode = false;

    for (const [index, line] of lines.entries()) {
      const trimmedLine = line.trim();

      // Skip allowed patterns and base64 patterns
      if (
        [...allowedPatterns].some((pattern) => pattern.test(trimmedLine)) ||
        isAllowedBase64(trimmedLine)
      ) {
        continue;
      }

      for (const [patternName, pattern] of obfuscationPatterns) {
        if (pattern.test(line)) {
          shouldStoreFormattedCode = true;

          // Get more context
          const startLine = Math.max(0, index - 2);
          const endLine = Math.min(lines.length, index + 3);
          const contextLines = lines.slice(startLine, endLine);

          // For base64 patterns, try to extract the actual encoded content
          let base64Content = '';
          if (patternName.includes('Base64')) {
            const match = line.match(
              /atob\s*\(\s*["'`]([A-Za-z0-9+/=]+)["'`]\s*\)/,
            );
            if (match && match[1]) {
              try {
                base64Content = atob(match[1].toString()).slice(0, 100) + '...';
              } catch {
                base64Content = 'Invalid base64 content';
              }
            }
          }

          matches.push({
            base64Content,
            detectedPackage: [...detectedPackages].join(', ') || undefined,
            excerpt: contextLines.join('\n'),
            line: index + 1,
            patternName,
          });

          // Chrome Store specifically flags Uint8Array.from(atob()) patterns
          suspiciousScore +=
            patternName === 'blobFromBase64'
              ? 10 // Highest priority
              : getPatternWeight(patternName);
        }
      }
    }

    // Always report files with blob/base64 patterns as they're specifically flagged
    if (
      matches.some(
        (m) =>
          m.patternName === 'blobFromBase64' ||
          m.patternName === 'directBase64Decode',
      )
    ) {
      return {
        detectedPackages,
        filePath,
        matches,
        suspiciousScore,
      };
    }

    // For other patterns, only report if score is significant
    if (suspiciousScore < 3) {
      return null;
    }

    // If we found matches, store the formatted code for review
    if (shouldStoreFormattedCode) {
      const formattedFilePath = filePath.replace('.js', '.formatted.js');
      await writeFile(formattedFilePath, formattedContent);
      console.log(`Formatted code saved to: ${formattedFilePath}`);
    }

    return suspiciousScore > 0 || detectedPackages.size > 0
      ? {
          detectedPackages,
          filePath,
          matches,
          suspiciousScore,
        }
      : null;
  } catch (error) {
    console.error(`Error analyzing file ${filePath}:`, error);
    return null;
  }
}
