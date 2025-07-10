import { Button } from '@acme/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@acme/ui/card';
import { Icons } from '@acme/ui/icons';
import { useUser } from '@clerk/chrome-extension';
import { useEffect, useState } from 'react';

import '../style.css';

import ycCfLogo from 'data-base64:~/../assets/yc-cf-logo.png';

import { CouponDiscountAlert } from '~/components/coupon-discount-alert';
import { Footer } from '~/components/footer';
import { PoweredByLink } from '~/components/powered-by-link';
import { Providers } from '~/providers';

// Add this interface for the invoice data
interface Invoice {
  id: string;
  description: string;
  amountPaid: number;
  currency: string;
  hostedInvoiceUrl: string | null;
}

function AccountPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [_usageStats, setUsageStats] = useState({
    evaluatedAnswers: 0,
    generatedResponses: 0,
    practiceSessions: 0,
  });
  // Add state for invoices
  const [_invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    // TODO: Fetch actual usage stats from your backend
    // This is a placeholder for demonstration
    setUsageStats({
      evaluatedAnswers: 8,
      generatedResponses: 15,
      practiceSessions: 3,
    });

    // TODO: Fetch actual invoices from your backend
    // This is a placeholder for demonstration
    setInvoices([
      {
        amountPaid: 2000,
        currency: 'USD',
        description: 'Monthly Subscription',
        hostedInvoiceUrl: 'https://example.com/invoice1',
        id: 'inv_1',
      },
      {
        amountPaid: 500,
        currency: 'USD',
        description: 'Additional Usage',
        hostedInvoiceUrl: 'https://example.com/invoice2',
        id: 'inv_2',
      },
    ]);
  }, []);

  if (!isLoaded || !isSignedIn) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-base text-foreground antialiased">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex flex-col gap-2">
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  <img
                    alt="YC vibe-check"
                    className="h-16 w-auto"
                    src={ycCfLogo}
                  />
                  <div className="flex flex-col gap-2">
                    <span>YC vibe-check - Account</span>
                    <div className="text-sm text-muted-foreground">
                      Manage your account and view your usage statistics
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <PoweredByLink />
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  chrome.tabs.create({
                    url: './tabs/welcome.html',
                  });
                }}
                variant="outline"
              >
                <Icons.Bookmark className="mr-2" />
                Tutorial
              </Button>
              <Button
                onClick={() => {
                  chrome.tabs.create({
                    url: './tabs/changelog.html',
                  });
                }}
                variant="outline"
              >
                <Icons.Bell className="mr-2" />
                Changelog
              </Button>
              <Button asChild variant="outline">
                <a
                  href="https://apply.ycombinator.com"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Icons.Plus className="mr-2" />
                  New YC App
                </a>
              </Button>
              <Button asChild variant="outline">
                <a
                  href="https://apply.ycombinator.com/app/edit"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Icons.Pencil className="mr-2" />
                  Open YC App
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
        <CouponDiscountAlert />

        <div className="flex flex-1 flex-col gap-4">
          <section>
            <Card>
              <CardHeader>
                <CardTitle>User Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  <strong>Name:</strong> {user.fullName}
                </p>
                <p>
                  <strong>Email:</strong>{' '}
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </CardContent>
            </Card>
          </section>
          {/*
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Your Activity</CardTitle>
                <CardDescription>
                  Here's a summary of your YC vibe-check usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-2 text-muted-foreground">
                  <li>Generated Responses: {usageStats.generatedResponses}</li>
                  <li>Evaluated Answers: {usageStats.evaluatedAnswers}</li>
                  <li>Practice Sessions: {usageStats.practiceSessions}</li>
                </ul>
              </CardContent>
            </Card>
          </section> */}
          {/*
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Billing</CardTitle>
                <CardDescription>
                  Manage your billing information and view your invoices.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Button asChild variant="outline">
                    <a
                      href="https://app.acme.ai/companies/your-company-id/settings/billing"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Manage Billing
                    </a>
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount Paid</TableHead>
                      <TableHead>Invoice Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => {
                      const currencyFormatter = new Intl.NumberFormat("en-US", {
                        currency: invoice.currency,
                        style: "currency",
                      });

                      return (
                        <TableRow key={invoice.id}>
                          <TableCell>{invoice.description}</TableCell>
                          <TableCell>
                            {currencyFormatter.format(invoice.amountPaid / 100)}
                          </TableCell>
                          <TableCell>
                            {invoice.hostedInvoiceUrl && (
                              <Button variant="link" size="sm" asChild>
                                <a
                                  href={invoice.hostedInvoiceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View Invoice
                                </a>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section> */}

          <section>
            <h2 className="mb-4 text-2xl font-semibold">Need Help?</h2>
            <p className="mb-4 text-muted-foreground">
              If you have any questions about your account or need assistance,
              don't hesitate to reach out.
            </p>
            <Button asChild variant="outline">
              <a href="mailto:vibes@acme.ai">
                <Icons.Mail className="mr-2" />
                Contact Support
              </a>
            </Button>
          </section>
        </div>

        <div className="mt-12">
          <Footer />
        </div>
      </div>
    </div>
  );
}

function ClerkProviderWrapper() {
  return (
    <Providers>
      <AccountPage />
    </Providers>
  );
}

export default ClerkProviderWrapper;
