import baseConfig from '@seawatts/next-config/base';
import { withWorkflow } from 'workflow/next';

// Compiles the `'use workflow'` and `'use step'` functions in src/workflows
// and serves the routes the workflow queue calls (docs/agents/events.md).
export default withWorkflow({
  ...baseConfig,
  // Short links are shared as /s/<code>; the route handler lives under /api.
  rewrites: async () => [{ destination: '/api/s/:code', source: '/s/:code' }],
});
