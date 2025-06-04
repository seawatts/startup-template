import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parentPort } from 'node:worker_threads';

// Get the directory name correctly in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dynamic imports for ESM compatibility
const { formatCode, getPatternWeight, isAllowedBase64 } = await import(
  './utils.js'
);
const { allowedPatterns, obfuscationPatterns, packageSignatures } =
  await import('./constants.js');

// Combine patterns into a single regex where possible
const combinedObfuscationPattern = new RegExp(
  [...obfuscationPatterns.values()].map((p) => p.source).join('|'),
  'i',
);

async function analyzeFile(filePath) {
  try {
    console.log(`Worker analyzing: ${path.basename(filePath)}`);
    const content = await readFile(filePath, 'utf8');

    // Quick check if file needs detailed analysis
    if (!combinedObfuscationPattern.test(content)) {
      console.log(`No suspicious patterns in: ${path.basename(filePath)}`);
      return null;
    }

    console.log(
      `Found potential matches in: ${path.basename(filePath)}, analyzing...`,
    );

    const matches = [];
    let suspiciousScore = 0;
    const detectedPackages = new Set();

    if (filePath.endsWith('.map') || filePath.includes('vendor')) {
      return null;
    }

    // First detect any known packages
    for (const [packageName, signature] of packageSignatures) {
      if (signature.test(content)) {
        console.log(
          `Detected package ${packageName} in: ${path.basename(filePath)}`,
        );
        detectedPackages.add(packageName);
      }
    }

    // Only format code if we need to analyze it further
    console.log(
      `Formatting code for detailed analysis: ${path.basename(filePath)}`,
    );
    const formattedContent = await formatCode(content);
    const lines = formattedContent.split('\n');

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

          suspiciousScore += getPatternWeight(patternName);
        }
      }
    }

    if (matches.length === 0 || suspiciousScore < 3) {
      return null;
    }

    console.log(
      `Analysis complete for ${path.basename(filePath)}: ` +
        `Found ${matches.length} matches, score: ${suspiciousScore}`,
    );

    return {
      detectedPackages,
      filePath,
      matches,
      suspiciousScore,
    };
  } catch (error) {
    console.error(`Error analyzing file ${path.basename(filePath)}:`, error);
    return null;
  }
}

// Handle messages from the main thread
if (parentPort) {
  parentPort.on('message', async ({ files }) => {
    try {
      // Process one file at a time
      const file = files[0];
      console.log(`Worker received file: ${path.basename(file)}`);

      const analysis = await analyzeFile(file);

      // Send result back to main thread
      parentPort?.postMessage(analysis);
      console.log(`Worker completed analysis for: ${path.basename(file)}`);
    } catch (error) {
      console.error(`Worker error analyzing file:`, error);
      // Send null to indicate analysis failed
      parentPort?.postMessage(null);
    }
  });
}
