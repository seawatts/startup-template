import prettier from 'prettier';

import { allowedBase64Patterns, knownMinifiedPackages } from './constants.js';

export async function formatCode(code) {
  try {
    return await prettier.format(code, {
      parser: 'babel',
      printWidth: 80,
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'es5',
    });
  } catch (error) {
    // If formatting fails, return original code
    console.warn('Failed to format code:', error);
    return code;
  }
}

export function isAllowedBase64(content) {
  return [...allowedBase64Patterns].some((pattern) => pattern.test(content));
}

export function getPatternWeight(patternName) {
  switch (patternName) {
    case 'encodedEval':
    case 'functionConstruction':
    case 'hiddenEval': {
      return 5;
    } // Highest risk
    case 'directEval':
    case 'hexStrings':
    case 'unicodeEscapes': {
      return 3;
    } // Medium risk
    case 'suspiciousBase64':
    case 'suspiciousHex':
    case 'stringSplitting': {
      return 2;
    } // Lower risk
    default: {
      return 1;
    } // Base risk
  }
}

export function getSuggestion(patternName, packageName) {
  if (
    patternName === 'blobFromBase64' ||
    patternName === 'directBase64Decode'
  ) {
    return (
      'Chrome Web Store specifically prohibits base64-encoded code. Consider:\n' +
      '1. Including the source directly in your extension\n' +
      '2. Loading it from a separate, human-readable file\n' +
      '3. If using a bundler, check its configuration to prevent code encoding'
    );
  }

  if (knownMinifiedPackages.has(packageName)) {
    return 'This is from a known package and likely safe';
  }

  switch (patternName) {
    case 'evalUsage': {
      return 'Evaluate if this eval() usage can be replaced with safer alternatives';
    }
    case 'longVariables': {
      return 'Check if this is intentional or result of poor minification';
    }
    case 'base64': {
      return 'Verify this encoded content is not hiding malicious code';
    }
    default: {
      return 'Review for potential security concerns';
    }
  }
}
