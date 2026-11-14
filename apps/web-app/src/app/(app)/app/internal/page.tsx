import { Console } from './_components/console';

export const metadata = { title: 'Internal' };

export default function InternalPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Internal</h1>
        <p className="text-sm text-muted-foreground">
          Every organization using the product. Only operators see this.
        </p>
      </div>
      <Console />
    </div>
  );
}
