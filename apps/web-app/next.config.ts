import baseConfig from '@seawatts/next-config/base';
import { withWorkflow } from 'workflow/next';

// Compiles the `'use workflow'` and `'use step'` functions in src/workflows
// and serves the routes the workflow queue calls (docs/agents/events.md).
export default withWorkflow(baseConfig);
