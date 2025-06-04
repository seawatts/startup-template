import pluralize from 'pluralize';
import * as React from 'react';

import { Button } from '@acme/ui/button';
import { Icons } from '@acme/ui/icons';
import { Input } from '@acme/ui/input';
import { Label } from '@acme/ui/label';

export function ReferForm(props: {
  children: (props: {
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
    error: unknown;
    data: unknown;
  }) => React.ReactNode;
}) {
  const [emails, setEmails] = React.useState<string[]>(['']);

  const addEmailInput = () => {
    setEmails([...emails, '']);
  };

  const removeEmailInput = (index: number) => {
    const newEmails = emails.filter((_, index_) => index_ !== index);
    setEmails(newEmails);
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const emailLabel = pluralize('Founder Email', emails.length);

  return (
    <form onSubmit={() => {}} className="flex flex-col gap-4">
      <div className="flex flex-col gap-y-4 px-4 lg:px-0">
        <Label htmlFor="email-0">{emailLabel}</Label>
        {emails.map((email, index) => (
          <div key={email} className="flex items-center gap-2">
            <Input
              id={`email-${index}`}
              name={`email-${index}`}
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(index, e.target.value)}
            />
            {index > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeEmailInput(index)}
              >
                <Icons.X />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex gap-2 self-start"
          onClick={addEmailInput}
        >
          <Icons.Plus />
          Add Another Email
        </Button>
      </div>

      {props.children({
        data: null,
        error: null,
        isError: false,
        isPending: false,
        isSuccess: true,
      })}
    </form>
  );
}
