import { BillingSettings } from './_components/billing-settings';

// A static frame: each section reads its own data through oRPC on the
// client and shows its own skeleton while it waits.
export default function BillingPage() {
  return <BillingSettings />;
}
