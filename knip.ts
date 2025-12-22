import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: ['**/drizzle.config.ts', '**/metro.config.js', '**/babel.config.js'],
  ignoreDependencies: [
    '@vercel/analytics',
    '@vercel/config',
    'lefthook',
    '@vercel/speed-insights',
    'react-dom',
    'vitest',
    '@tailwindcss/typography',
    '@trpc/react-query',
    'tailwindcss',
    '@happy-dom/global-registrator',
    '@react-email/components',
    '@types/aws-lambda',
    '@vscode/test-electron',
    'cli-highlight',
    'figlet',
    'clipboardy',
    'chalk',
    'react-error-boundary',
    '@dnd-kit/core',
    '@dnd-kit/modifiers',
    '@dnd-kit/sortable',
    '@dnd-kit/utilities',
    '@hookform/resolvers',
    '@number-flow/react',
    '@commitlint/cli',
    '@tanstack/react-table',
  ],
  ignoreExportsUsedInFile: true,
  ignoreWorkspaces: [
    'apps/expo',
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
    'apps/chrome-extension': {
      entry: ['src/**/*.tsx', 'src/**/*.ts'],
      project: ['src/**/*.ts', 'src/**/*.tsx'],
    },
    'apps/cli': {
      entry: ['src/**/*.tsx', 'src/**/*.ts'],
      project: ['src/**/*.ts', 'src/**/*.tsx'],
    },
    'apps/vscode-extension': {
      entry: ['src/**/*.tsx', 'src/**/*.ts'],
      project: ['src/**/*.ts', 'src/**/*.tsx'],
    },
    'apps/web-app': {
      entry: ['src/**/*.tsx', 'src/**/*.ts'],
      project: ['src/**/*.ts', 'src/**/*.tsx'],
    },
    'packages/*': {
      entry: ['src/**/*.ts', 'src/**/*.tsx'],
      project: ['src/**/*.ts', 'src/**/*.tsx'],
    },
    'packages/auth': {
      entry: ['src/**/*.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/id': {
      entry: ['src/**/*.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/integ-test': {
      entry: ['src/**/*.ts', 'test-utils/**/*.ts', 'vitest.config.ts'],
      project: ['src/**/*.ts', 'test-utils/**/*.ts'],
    },
    'packages/logger': {
      entry: ['src/**/*.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/utils': {
      entry: ['src/**/*.ts'],
      project: ['src/**/*.ts'],
    },
    'tooling/testing': {
      entry: ['src/**/*.ts'],
      project: ['src/**/*.ts'],
    },
  },
};

export default config;
