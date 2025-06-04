import { readdir, rm } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { writeDebugOutput } from './debug-output.js';
import type { FileGroup } from './types.js';

// Get the directory name correctly in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function cleanupPreviousOutput(
  debugDirectory: string,
  buildDirectories: string[],
) {
  try {
    // Clean up debug output directory
    await rm(debugDirectory, { force: true, recursive: true });
    console.log('Cleaned up previous analysis output');

    // Clean up any .formatted.js files in build directories
    for (const buildDirectory of buildDirectories) {
      const files = await readdir(buildDirectory, { recursive: true });
      const formattedFiles = files.filter((file) =>
        file.toString().endsWith('.formatted.js'),
      );

      await Promise.all(
        formattedFiles.map((file) =>
          rm(path.join(buildDirectory, file.toString())),
        ),
      );

      if (formattedFiles.length > 0) {
        console.log(
          `Cleaned up ${formattedFiles.length} formatted files from ${buildDirectory}`,
        );
      }
    }
  } catch (error) {
    // Ignore errors if directory doesn't exist
    if ((error as { code?: string }).code !== 'ENOENT') {
      console.warn('Error cleaning up previous output:', error);
    }
  }
}

// Create a worker pool for parallel processing
function createWorkerPool(size: number) {
  return Array.from({ length: size }, () => {
    const workerPath = path.join(__dirname, 'file-analyzer.worker.js');
    return new Worker(workerPath);
  });
}

async function detectObfuscation() {
  try {
    const buildDirectories = [
      path.join(import.meta.dirname, '../../build/chrome-mv3-prod'),
    ];

    console.log('Starting obfuscation detection...');
    console.log('Build directories:', buildDirectories);

    const debugDirectory = path.join(import.meta.dirname, './debug-output');
    await cleanupPreviousOutput(debugDirectory, buildDirectories);

    const fileGroups = new Map<string, FileGroup[]>();
    let totalSuspiciousFiles = 0;
    let totalFilesProcessed = 0;

    // Create a smaller worker pool to avoid overwhelming the system
    const workerCount = Math.max(1, Math.min(4, os.cpus().length - 1));
    console.log(`Creating worker pool with ${workerCount} workers`);
    const workerPool = createWorkerPool(workerCount);

    for (const buildDirectory of buildDirectories) {
      console.log(`\nAnalyzing directory: ${buildDirectory}`);

      const files = await readdir(buildDirectory, { recursive: true });
      const jsFiles = files
        .filter(
          (file) =>
            file.toString().endsWith('.js') &&
            !file.toString().endsWith('.formatted.js'),
        )
        .map((file) => path.join(buildDirectory, file.toString()));

      console.log(`Found ${jsFiles.length} JavaScript files to analyze`);

      // Process files in smaller batches
      const batchSize = 10;
      const batches = [];
      for (
        let batchIndex = 0;
        batchIndex < jsFiles.length;
        batchIndex += batchSize
      ) {
        batches.push(jsFiles.slice(batchIndex, batchIndex + batchSize));
      }

      console.log(`Split files into ${batches.length} batches of ${batchSize}`);

      // Process batches sequentially through workers
      for (const [batchNumber, batch] of batches.entries()) {
        console.log(
          `\nProcessing batch ${batchNumber + 1}/${batches.length} (${batch.length} files)`,
        );

        const analysisPromises = batch.map((file) => {
          return new Promise<void>((resolve, reject) => {
            const workerIndex = Math.floor(Math.random() * workerPool.length);
            const worker = workerPool[workerIndex];

            if (!worker) {
              console.error('No worker available at index:', workerIndex);
              return reject(new Error('No worker available'));
            }

            const timeoutId = setTimeout(() => {
              console.warn(`Analysis timeout for file: ${path.basename(file)}`);
              reject(new Error(`Analysis timeout for file: ${file}`));
            }, 30_000); // 30 second timeout

            worker.once('message', (analysis) => {
              clearTimeout(timeoutId);
              totalFilesProcessed++;

              const progress = (
                (totalFilesProcessed / jsFiles.length) *
                100
              ).toFixed(1);
              process.stdout.write(
                `\rProgress: ${progress}% (${totalFilesProcessed}/${jsFiles.length} files)`,
              );

              if (analysis && analysis.matches.length > 0) {
                totalSuspiciousFiles++;
                console.log(
                  `\nFound suspicious patterns in: ${path.basename(file)}`,
                );

                for (const package_ of analysis.detectedPackages) {
                  const relevantMatches = analysis.matches.filter(
                    (m: { detectedPackage?: string }) =>
                      m.detectedPackage?.includes(package_),
                  );

                  if (relevantMatches.length > 0) {
                    if (!fileGroups.has(package_)) {
                      fileGroups.set(package_, []);
                    }
                    fileGroups.get(package_)?.push({
                      filePath: analysis.filePath,
                      matches: relevantMatches,
                      packageName: package_,
                    });
                  }
                }

                if (analysis.detectedPackages.size === 0) {
                  const unknownGroup = 'unknown';
                  if (!fileGroups.has(unknownGroup)) {
                    fileGroups.set(unknownGroup, []);
                  }
                  fileGroups.get(unknownGroup)?.push({
                    filePath: analysis.filePath,
                    matches: analysis.matches,
                    packageName: unknownGroup,
                  });
                }
              }
              resolve();
            });

            worker.postMessage({ files: [file] });
          });
        });

        // Wait for current batch to complete before processing next batch
        try {
          await Promise.all(analysisPromises);
          console.log(`\nCompleted batch ${batchNumber + 1}`);
        } catch (error) {
          console.error('\nError processing batch:', error);
          // Continue with next batch even if current one had errors
        }
      }
    }

    console.log('\n\nAnalysis phase complete, cleaning up...');

    // Cleanup workers
    await Promise.all(workerPool.map((worker) => worker.terminate()));
    console.log('Workers terminated');

    // Write results
    console.log('Writing analysis results...');
    const outputDirectory = await writeDebugOutput(
      fileGroups,
      totalSuspiciousFiles,
    );

    console.log(`\nAnalysis complete! Results written to: ${outputDirectory}`);
    console.log(`Total files processed: ${totalFilesProcessed}`);
    console.log(`Total suspicious files found: ${totalSuspiciousFiles}`);
    console.log(
      'Review the README.md file in the output directory for guidance.',
    );
  } catch (error) {
    console.error('Error during obfuscation detection:', error);
    throw error;
  }
}

// Run the detection
await detectObfuscation();
