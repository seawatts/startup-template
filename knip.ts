import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: ['**/drizzle.config.ts', '**/metro.config.js', '**/babel.config.js'],
  ignoreDependencies: ['cz-conventional-changelog'],
  ignoreWorkspaces: ['apps/expo'],
  workspaces: {
    '.': {
      entry: 'checkly.config.ts',
    },
    'apps/*': {
      entry: ['**/*.test.ts'],
    },
    'packages/*': {
      entry: ['**/*.test.ts'],
    },
  },
};

export default config;
