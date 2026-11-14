import { db } from '@seawatts/db/client';
import { ShortUrls } from '@seawatts/db/schema/short-urls';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export async function GET(
  _request: Request,
  props: { params: Promise<{ code: string }> },
) {
  const params = await props.params;
  const shortUrl = await db
    .select()
    .from(ShortUrls)
    .where(eq(ShortUrls.code, params.code))
    .limit(1)
    .then((rows) => rows[0]);

  if (!shortUrl) {
    return new Response('Not found', { status: 404 });
  }

  redirect(shortUrl.redirectUrl);
}
