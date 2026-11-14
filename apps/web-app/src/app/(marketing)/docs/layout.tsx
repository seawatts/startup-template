import { DocsNav } from '../_components/docs/docs-nav';
import { FooterSection } from '../_components/sections/footer-section';
import { Navbar } from '../_components/sections/navbar';
import { siteConfig } from '../_lib/config';
import { docsNav } from '../_lib/docs';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar navs={siteConfig.nav.links} />
      <main className="mx-auto mt-24 w-full max-w-screen-xl px-4 pb-24 lg:px-20">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <DocsNav items={docsNav} />
          </aside>
          <article className="min-w-0 max-w-3xl">{children}</article>
        </div>
      </main>
      <FooterSection />
    </>
  );
}
