import { defineConfig } from 'vite';
import baseConfig from './vite.config';

export default defineConfig({
  ...baseConfig,
  build: {
    ...baseConfig.build,
    minify: false,
    sourcemap: true,
    watch: {
      include: ['src/webview/**/*'],
    },
  },
  server: {
    hmr: {
      clientPort: 5173,
      port: 5173,
      protocol: 'ws',
      timeout: 30000,
    },
    port: 5173,
    strictPort: true,
    watch: {
      interval: 1000,
      usePolling: true,
    },
  },
});
