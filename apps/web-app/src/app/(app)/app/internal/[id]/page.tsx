import { IconChevronLeft } from '@tabler/icons-react';
import Link from 'next/link';
import { Organization } from '../_components/organization';

export const metadata = { title: 'Organization · Internal' };

export default async function InternalOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        href="/app/internal"
      >
        <IconChevronLeft className="size-4" />
        Internal
      </Link>
      <Organization id={id} />
    </div>
  );
}
