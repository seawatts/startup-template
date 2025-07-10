import { Button } from '@acme/ui/button';
import { Icons } from '@acme/ui/icons';
import { Input } from '@acme/ui/input';
import { Label } from '@acme/ui/label';
import pluralize from 'pluralize';
import * as React from 'react';

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
    <form className="flex flex-col gap-4" onSubmit={() => {}}>
      <div className="flex flex-col gap-y-4 px-4 lg:px-0">
        <Label htmlFor="email-0">{emailLabel}</Label>
        {emails.map((email, index) => (
          <div className="flex items-center gap-2" key={email}>
            <Input
              id={`email-${index}`}
              name={`email-${index}`}
              onChange={(e) => handleEmailChange(index, e.target.value)}
              type="email"
              value={email}
            />
            {index > 0 && (
              <Button
                onClick={() => removeEmailInput(index)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Icons.X />
              </Button>
            )}
          </div>
        ))}
        <Button
          className="flex gap-2 self-start"
          onClick={addEmailInput}
          size="sm"
          type="button"
          variant="ghost"
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
