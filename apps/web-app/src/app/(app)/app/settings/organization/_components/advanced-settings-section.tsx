'use client';

import { MetricButton } from '@seawatts/analytics/components';
import { useORPC } from '@seawatts/api/react/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@seawatts/ui/card';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DeleteOrganizationDialog } from './delete-organization-dialog';

export function AdvancedSettingsSection() {
  // State for delete organization dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const api = useORPC();
  const router = useRouter();
  const deleteOrganization = useMutation(api.org.delete.mutationOptions());
  const isDeleting = deleteOrganization.isPending;

  const handleDeleteOrganization = async () => {
    try {
      await deleteOrganization.mutateAsync({ confirm: true });
      setIsDeleteDialogOpen(false);
      router.push('/app/dashboard');
    } catch (error) {
      // Error handling is done in the dialog component
      console.error('Failed to delete organization:', error);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <CardTitle className="text-lg">Delete Organization</CardTitle>
              <CardDescription className="mt-2">
                This action cannot be undone. This will permanently delete your
                organization and remove all data.
              </CardDescription>
            </div>
            <MetricButton
              metric="advanced_settings_delete_organization_clicked"
              onClick={() => setIsDeleteDialogOpen(true)}
              variant="destructive"
            >
              Delete Organization
            </MetricButton>
          </div>
        </CardContent>
      </Card>

      <DeleteOrganizationDialog
        isDeleting={isDeleting}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteOrganization}
      />
    </>
  );
}
