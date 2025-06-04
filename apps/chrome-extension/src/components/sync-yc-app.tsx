import { useEffect, useRef } from 'react';

import { api } from '@acme/api/chrome-extension';

import { useYcApp } from '~/hooks/yc/use-yc-app';

export function SyncYcApp() {
  const { app, isLoading } = useYcApp();
  const { mutateAsync: updateApplicationStatus } =
    api.application.updateStatus.useMutation();
  const hasSynced = useRef(false);

  useEffect(() => {
    async function syncYcApp() {
      if (!app || hasSynced.current) return;

      await updateApplicationStatus({
        externalId: app.uuid,
        metadata: {
          interviewInPerson: app.interviewInPerson,
          interviewQuestionsFilledIn: app.interviewQuestionsFilledIn,
          interviewTime: app.interviewTime,
          interviewWithin30Min: app.interviewWithin30Min,
          interviewZoomUrl: app.interviewZoomUrl,
          invited: app.invited,
          lastMessageRepliedTo: app.lastMessageRepliedTo,
          submitted: app.submitted,
          ycMessageCount: app.ycMessageCount,
        },
        status: app.status,
        submittedAt: app.submittedAt,
      });

      hasSynced.current = true;
    }

    syncYcApp();
  }, [app, isLoading, updateApplicationStatus, hasSynced]);

  return null;
}
