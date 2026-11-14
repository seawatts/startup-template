// The cron's ping of /api/rpc/__warm (warm-api.ts), in its own file so the
// cron route doesn't load the API router: the ping has to reach the
// function that serves /api/rpc, not run inside the cron's own.
// Never lets a failed ping fail the cron run.
export async function pingWarmApi(cronRequest: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;
  try {
    await fetch(new URL('/api/rpc/__warm', cronRequest.url), {
      cache: 'no-store',
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    /* the next run tries again */
  }
}
