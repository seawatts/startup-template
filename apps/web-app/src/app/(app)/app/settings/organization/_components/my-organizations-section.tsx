'use client';

import { MetricButton } from '@seawatts/analytics/components';
import { useORPC } from '@seawatts/api/react/react';
import {
  useActiveOrganization,
  useListOrganizations,
} from '@seawatts/auth/client';
import { Badge } from '@seawatts/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@seawatts/ui/card';
import { Skeleton } from '@seawatts/ui/skeleton';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { LeaveOrganizationDialog } from './leave-organization-dialog';

export function MyOrganizationsSection() {
  const { data: activeOrg } = useActiveOrganization();
  const { data: organizations, isPending: loading } = useListOrganizations();

  // State for leave organization dialog
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [targetOrganization, setTargetOrganization] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const api = useORPC();
  const leave = useMutation(api.orgMembers.leave.mutationOptions());
  const isLeaving = leave.isPending;

  const handleLeaveOrganization = async () => {
    if (!targetOrganization) return;

    try {
      await leave.mutateAsync({ organizationId: targetOrganization.id });
      setIsLeaveDialogOpen(false);
      setTargetOrganization(null);
    } catch (error) {
      console.error('Failed to leave organization:', error);
    }
  };

  const openLeaveDialog = (organization: { id: string; name: string }) => {
    setTargetOrganization(organization);
    setIsLeaveDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>My Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div className="flex items-center justify-between" key={i}>
                  <div className="flex items-center gap-3 border-l-2 border-secondary">
                    <Skeleton className="h-4 w-32 ml-2" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {organizations?.map((org) => (
                <div className="flex items-center justify-between" key={org.id}>
                  <div className="flex items-center gap-3 border-l-2 border-secondary">
                    <span className="text-sm pl-2">{org.name}</span>
                    {org.id === activeOrg?.id && (
                      <Badge variant="secondary">Current</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <MetricButton
                      metric="my_organizations_leave_clicked"
                      onClick={() =>
                        openLeaveDialog({
                          id: org.id,
                          name: org.name,
                        })
                      }
                      size="sm"
                      variant="destructive"
                    >
                      Leave
                    </MetricButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <LeaveOrganizationDialog
        isLeaving={isLeaving}
        isOpen={isLeaveDialogOpen}
        onClose={() => {
          setIsLeaveDialogOpen(false);
          setTargetOrganization(null);
        }}
        onConfirm={handleLeaveOrganization}
        organizationName={targetOrganization?.name}
      />
    </>
  );
}
