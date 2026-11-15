// Post-deploy check: one request to every kind of server function, not just
// the health route and a page. A function that cannot load its packages on
// the production runtime answers 500 here while health stays green.
//
//   bun scripts/check-deploy.ts https://your-app.example
//
// Each request expects the status the route gives a caller with no
// credentials, which proves the function loaded and ran its own code.
// Nothing here signs in, writes or sends.

type Probe = {
  kind: string;
  path: string;
  method?: 'GET' | 'POST';
  expect: number[];
};

const unknown = `deploy-check-${Date.now().toString(36)}`;

const probes: Probe[] = [
  { expect: [200], kind: 'plain route', path: '/api/health' },
  { expect: [200], kind: 'auth (Better Auth)', path: '/api/auth/ok' },
  { expect: [200], kind: 'auth session read', path: '/api/auth/get-session' },
  {
    expect: [400],
    kind: 'Stripe webhook',
    method: 'POST',
    path: '/api/webhooks/stripe',
  },
  { expect: [401], kind: 'cron', path: '/api/cron/warm' },
  { expect: [401], kind: 'oRPC', path: '/api/rpc/__warm' },
  { expect: [200], kind: 'REST catalog', path: '/api/v1' },
  { expect: [200], kind: 'OpenAPI document', path: '/api/v1/openapi.json' },
  { expect: [401], kind: 'MCP', path: '/api/mcp' },
  { expect: [404], kind: 'database read', path: `/api/s/${unknown}` },
  { expect: [200], kind: 'marketing page', path: '/' },
  { expect: [200], kind: 'docs page', path: '/docs' },
  { expect: [200], kind: 'sign-in page', path: '/sign-in' },
  { expect: [307], kind: 'signed-out product redirect (proxy)', path: '/app' },
  // Not prerendered, so the function renders it and loads its external packages.
  {
    expect: [200, 404],
    kind: 'page with an external package',
    path: `/blog/${unknown}`,
  },
];

async function run(base: string, probe: Probe) {
  const started = performance.now();
  try {
    const response = await fetch(new URL(probe.path, base), {
      body: probe.method === 'POST' ? '{}' : undefined,
      headers: {
        'content-type': 'application/json',
        // The host's bot filter refuses the default client names.
        'user-agent': 'Mozilla/5.0 (compatible; deploy-check)',
      },
      method: probe.method ?? 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
    });
    await response.arrayBuffer();
    return {
      ms: Math.round(performance.now() - started),
      ok: probe.expect.includes(response.status),
      status: String(response.status),
    };
  } catch (error) {
    return {
      ms: Math.round(performance.now() - started),
      ok: false,
      status: error instanceof Error ? error.name : 'error',
    };
  }
}

if (import.meta.main) {
  const base = process.argv[2];
  if (!base) {
    console.error('Usage: bun scripts/check-deploy.ts <base url>');
    process.exit(1);
  }
  const results = await Promise.all(probes.map((probe) => run(base, probe)));
  let failed = 0;
  probes.forEach((probe, index) => {
    const result = results[index];
    if (!result) return;
    if (!result.ok) failed += 1;
    console.log(
      `${result.ok ? 'ok  ' : 'FAIL'} ${result.status.padEnd(4)} ${String(result.ms).padStart(5)} ms  ${(probe.method ?? 'GET').padEnd(4)} ${probe.path}  (${probe.kind}; expects ${probe.expect.join(' or ')})`,
    );
  });
  if (failed > 0) {
    console.error(
      `\n${failed} of ${probes.length} kinds of function did not answer as expected.`,
    );
    process.exit(1);
  }
  console.log(`\nAll ${probes.length} kinds of function answered.`);
}
