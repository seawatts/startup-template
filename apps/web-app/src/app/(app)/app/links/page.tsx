import { CreateLinkForm } from './_components/create-link-form';
import { LinksList } from './_components/links-list';

// The example area's page. A server component only for the static frame:
// the heading renders at once, and each part below reads and writes through
// oRPC from the client with its own loading state (docs/agents/api.md).
export default function LinksPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Links</h1>
        <p className="text-sm text-muted-foreground">
          Short links your team can share. Turn one off to stop it working.
        </p>
      </div>
      <CreateLinkForm />
      <LinksList />
    </div>
  );
}
