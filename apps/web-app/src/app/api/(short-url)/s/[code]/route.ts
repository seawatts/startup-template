import { ShortUrls } from '@seawatts/db/schema/short-urls';
import { tenantOf } from '@seawatts/db/tenant-lookup';
import { inTenant } from '@seawatts/db/transaction';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export async function GET(
  _request: Request,
  props: { params: Promise<{ code: string }> },
) {
  const params = await props.params;
  // A public link: the organization is found first, then the row is read
  // inside it like any other tenant row.
  const organizationId = await tenantOf('short_url', params.code);
  const shortUrl = organizationId
    ? await inTenant(organizationId, (tx) =>
        tx
          .select()
          .from(ShortUrls)
          .where(eq(ShortUrls.code, params.code))
          .limit(1)
          .then((rows) => rows[0]),
      )
    : undefined;

  if (!shortUrl) {
    return new Response('Not found', { status: 404 });
  }

  redirect(shortUrl.redirectUrl);
}
