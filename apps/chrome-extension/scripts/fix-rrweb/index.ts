import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function fixRRWebCode() {
  try {
    // Read the replacement code
    const replacementCode = await readFile(
      path.join(import.meta.dirname, '../RRWeb Bug Code Replacement.txt'),
      'utf8',
    );
    const obfuscatedCode = await readFile(
      path.join(import.meta.dirname, '../RRWeb Obfuscated Code.txt'),
      'utf8',
    );

    // Get the build directory paths
    const buildDirectories = [
      path.join(import.meta.dirname, '../build/chrome-mv3-dev'),
      path.join(import.meta.dirname, '../build/chrome-mv3-prod'),
    ];

    for (const buildDirectory of buildDirectories) {
      // Read all files in the build directory
      const files = await readdir(buildDirectory);

      // Find and process content script files
      for (const file of files) {
        if (file.endsWith('.js')) {
          const filePath = path.join(buildDirectory, file);
          const content = await readFile(filePath, 'utf8');

          // Check if file contains the RRWeb code
          if (content.includes(replacementCode)) {
            // Replace the obfuscated code with the fixed code
            const updatedContent = content.replace(
              obfuscatedCode,
              replacementCode,
            );

            // Write the updated content back to the file
            await writeFile(filePath, updatedContent, 'utf8');
            console.log(`Fixed RRWeb code in ${filePath}`);
          }
        }
      }
    }

    console.log('RRWeb code replacement completed successfully');
  } catch (error) {
    console.error('Error fixing RRWeb code:', error);
    throw error;
  }
}

await fixRRWebCode();
