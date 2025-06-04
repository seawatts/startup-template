import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { knownMinifiedPackages } from './constants.js';
import { formatCode, getSuggestion } from './utils.js';

export async function writeDebugOutput(fileGroups, totalSuspiciousFiles) {
  const debugDirectory = path.join(import.meta.dirname, './debug-output');
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
  const analysisDirectory = path.join(debugDirectory, `analysis-${timestamp}`);

  // Create debug directories
  await mkdir(debugDirectory, { recursive: true });
  await mkdir(analysisDirectory, { recursive: true });

  // Write summary with total suspicious files
  const summary = {
    packages: Object.fromEntries(
      [...fileGroups.entries()].map(([package_, files]) => [
        package_,
        {
          fileCount: files.length,
          files: files.map((f) => path.basename(f.filePath)),
        },
      ]),
    ),
    totalFiles: [...fileGroups.values()].reduce(
      (accumulator, files) => accumulator + files.length,
      0,
    ),
    totalPackages: fileGroups.size,
    totalSuspiciousFiles,
  };

  await writeFile(
    path.join(analysisDirectory, 'summary.json'),
    JSON.stringify(summary, null, 2),
  );

  // Write detailed analysis for each package
  for (const [packageName, files] of fileGroups) {
    const packageDirectory = path.join(analysisDirectory, packageName);
    await mkdir(packageDirectory, { recursive: true });

    // Write package analysis
    const packageAnalysis = {
      files: await Promise.all(
        files.map(async (file) => {
          const originalContent = await readFile(file.filePath, 'utf8');
          const formattedContent = await formatCode(originalContent);

          // Create a map of line numbers to matches for this file
          const matchesByLine = new Map();
          for (const match of file.matches) {
            if (!matchesByLine.has(match.line)) {
              matchesByLine.set(match.line, []);
            }
            matchesByLine.get(match.line).push(match);
          }

          // Write formatted file with annotations
          const annotatedLines = formattedContent
            .split('\n')
            .map((line, index) => {
              const lineMatches = matchesByLine.get(index + 1);
              if (lineMatches) {
                return [
                  '/*',
                  ...lineMatches.map((m) => `  Pattern: ${m.patternName}`),
                  '*/',
                  line,
                ].join('\n');
              }
              return line;
            });

          const fileBaseName = path.basename(file.filePath, '.js');

          // Write annotated source
          await writeFile(
            path.join(packageDirectory, `${fileBaseName}.annotated.js`),
            annotatedLines.join('\n'),
          );

          // Write matches details
          const matchesDetails = {
            filePath: file.filePath,
            matches: file.matches.map((match) => ({
              ...match,
              suggestion: getSuggestion(match.patternName, packageName),
            })),
          };

          await writeFile(
            path.join(packageDirectory, `${fileBaseName}.analysis.json`),
            JSON.stringify(matchesDetails, null, 2),
          );

          return {
            matchCount: file.matches.length,
            name: path.basename(file.filePath),
            patterns: [...new Set(file.matches.map((m) => m.patternName))],
          };
        }),
      ),
      isKnownPackage: knownMinifiedPackages.has(packageName),
      name: packageName,
    };

    await writeFile(
      path.join(packageDirectory, 'package-analysis.json'),
      JSON.stringify(packageAnalysis, null, 2),
    );
  }

  // Write README with instructions
  const readme = `
# Obfuscation Analysis Results

Generated on: ${new Date().toLocaleString()}

## Summary
- Total suspicious files: ${totalSuspiciousFiles}
- Total packages with obfuscation: ${fileGroups.size}
- Total files affected: ${[...fileGroups.values()].reduce(
    (accumulator, files) => accumulator + files.length,
    0,
  )}

## Directory Structure

- \`summary.json\` - Overview of all findings
- \`{package-name}/\` - Directory for each detected package
  - \`package-analysis.json\` - Package-level analysis
  - \`{file-name}.annotated.js\` - Formatted source with annotations
  - \`{file-name}.analysis.json\` - Detailed match information

## How to Review

1. Start with \`summary.json\` to get an overview
2. For each package of interest:
   - Check \`package-analysis.json\` for package-level insights
   - Review \`.annotated.js\` files to see the code with annotations
   - Check \`.analysis.json\` files for detailed pattern matches

## Known Packages

${[...knownMinifiedPackages].map((package_) => `- ${package_}`).join('\n')}

## Recommendations

- Focus on files in the "unknown" package first
- Review eval usage patterns carefully
- Check long variable names in non-minified files
`;

  await writeFile(path.join(analysisDirectory, 'README.md'), readme);

  // Copy the HTML template to the analysis directory
  await copyFile(
    path.join(import.meta.dirname, './templates/analysis.html'),
    path.join(analysisDirectory, 'index.html'),
  );

  return analysisDirectory;
}
