import { useEffect, useRef } from 'react';

import { api } from '@acme/api/chrome-extension';

import { useYcDashboard } from '~/hooks/yc/use-yc-dashboard';

export function SyncYcDashboard() {
  const { apps, isLoading } = useYcDashboard();
  const { mutateAsync: updateApplicationStatus } =
    api.application.updateStatus.useMutation();
  const hasSynced = useRef(false);

  useEffect(() => {
    async function syncYcApps() {
      if (apps.length === 0 || isLoading || hasSynced.current) return;

      await Promise.all(
        apps.map(async (app) => {
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
        }),
      );

      hasSynced.current = true;
    }

    syncYcApps();
  }, [apps, isLoading, updateApplicationStatus, hasSynced]);

  return null;
}
