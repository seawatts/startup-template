import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: [
    '**/drizzle.config.ts',
    '**/metro.config.js',
    '**/babel.config.js',
    './package.json',
  ],
  ignoreDependencies: [
    // Used via postcss config, not direct imports
    'postcss',
    'tailwindcss',
    '@tailwindcss/postcss',
    'picocolors',
    '@clack/prompts',
    'react-native-worklets',
  ],
  ignoreExportsUsedInFile: true,
  ignoreWorkspaces: [
    'apps/ios',
    'tooling/next',
    'tooling/commitlint',
    'tooling/typescript',
    'tooling/github',
    'tooling/npm',
  ],
  rules: {
    dependencies: 'warn',
    enumMembers: 'warn',
  },
  workspaces: {
    '.': {
      entry: 'checkly.config.ts',
    },
    'apps/*': {
      entry: ['**/*.ts?(x)'],
      project: ['**/*.ts?(x)'],
    },
    'packages/*': {
      entry: ['**/*.ts?(x)'],
      project: ['**/*.ts?(x)'],
    },
    'scripts/*': {
      entry: ['**/*.ts?(x)'],
      project: ['**/*.ts?(x)'],
    },
    'tooling/testing': {
      entry: ['**/*.ts?(x)'],
      project: ['**/*.ts?(x)'],
    },
  },
};

export default config;
