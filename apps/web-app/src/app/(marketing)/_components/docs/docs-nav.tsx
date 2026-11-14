'use client';

import { cn } from '@seawatts/ui/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// The docs section list: a column beside the page on desktop, a row that
// scrolls sideways above it on a phone.
export function DocsNav({
  items,
}: {
  items: { href: string; title: string }[];
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Documentation"
      className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
    >
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-md px-3 py-2 text-sm transition-colors motion-reduce:transition-none',
              active
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
            href={item.href}
            key={item.href}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
