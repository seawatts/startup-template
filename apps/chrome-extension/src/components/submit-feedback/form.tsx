import * as React from 'react';

import { api } from '@acme/api/chrome-extension';
import { Label } from '@acme/ui/label';
import { Textarea } from '@acme/ui/textarea';

import { useCompany } from '../company/context';
import type { SubmitFeedbackType } from './types';

export function SubmitFeedbackForm(props: {
  children: (props: {
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
    error: unknown;
    data: unknown;
  }) => React.ReactNode;
  onSuccess: () => void;
  type: SubmitFeedbackType;
  element?: string;
}) {
  const { company } = useCompany();
  const submitFeedback = api.feedback.submitFeedback.useMutation();
  const [feedback, setFeedback] = React.useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // Get UTM parameters from URL
    const urlParams = new URLSearchParams(globalThis.location.search);
    const utmSource = urlParams.get('utm_source');
    const utmMedium = urlParams.get('utm_medium');
    const utmCampaign = urlParams.get('utm_campaign');
    const utmContent = urlParams.get('utm_content');
    const utmTerm = urlParams.get('utm_term');
    await submitFeedback.mutateAsync({
      companyId: company?.id ?? '',
      element: props.element,
      feedback,
      type: props.type,
      url: globalThis.location.href,
      utmCampaign: utmCampaign || undefined,
      utmContent: utmContent || undefined,
      utmMedium: utmMedium || undefined,
      utmSource: utmSource || undefined,
      utmTerm: utmTerm || undefined,
    });
    props.onSuccess();
  };

  let label = '';
  let placeholder = '';
  switch (props.type) {
    case 'feature-request': {
      label = 'Feature';
      placeholder = 'What feature do you need?';

      break;
    }
    case 'feedback': {
      label = 'Feedback';
      placeholder = 'What do you think?';

      break;
    }
    case 'bug-report': {
      label = 'Bug Report';
      placeholder = 'What went wrong?';

      break;
    }
    // No default
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-y-4 px-4 lg:px-0">
        <Label htmlFor="feedback" className="sr-only" aria-hidden>
          {label}
        </Label>
        <Textarea
          id="feedback"
          name="feedback"
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          disabled={submitFeedback.isPending}
          placeholder={placeholder}
        />
      </div>

      {props.children({
        data: submitFeedback.data,
        error: submitFeedback.error,
        isError: submitFeedback.isError,
        isPending: submitFeedback.isPending,
        isSuccess: submitFeedback.isSuccess,
      })}
    </form>
  );
}
