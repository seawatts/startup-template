import { pingWarmApi } from '~/server/warm-ping';

// Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. Add it
// to vercel.json to turn the warm-up on (docs/agents/api.md); every-minute
// schedules need a paid Vercel plan.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
    return new Response('Unauthorized', { status: 401 });
  await pingWarmApi(request);
  return Response.json({ ok: true });
}
