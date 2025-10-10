import { db } from '@seawatts/db/client';
import { redirect } from 'next/navigation';

export async function GET(
  _request: Request,
  props: { params: Promise<{ code: string }> },
) {
  const params = await props.params;
  const shortUrl = await db.query.ShortUrls.findFirst({
    where: (shortUrls, { eq }) => eq(shortUrls.code, params.code),
  });

  if (!shortUrl) {
    return new Response('Not found', { status: 404 });
  }

  redirect(shortUrl.redirectUrl);
}
