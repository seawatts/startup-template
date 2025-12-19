'use client';

import { MetricButton } from '@seawatts/analytics/components';
import { useTRPC } from '@seawatts/api/react';
import { useActiveOrganization, useSession } from '@seawatts/auth/client';
import { Card, CardContent, CardHeader, CardTitle } from '@seawatts/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@seawatts/ui/select';
import { Skeleton } from '@seawatts/ui/skeleton';
import { toast } from '@seawatts/ui/sonner';
import { useQuery } from '@tanstack/react-query';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { removeMemberAction, updateMemberRoleAction } from '../actions';
import { RemoveMemberDialog } from './remove-member-dialog';

export function OrganizationMembersSection() {
  const api = useTRPC();
  const { data: session } = useSession();
  const user = session?.user;
  const { data: activeOrg } = useActiveOrganization();

  // Fetch members using orgMembers router
  const { data: members, isLoading: loading } = useQuery(
    api.orgMembers.all.queryOptions(undefined, { enabled: !!activeOrg?.id }),
  );

  // State for remove member dialog
  const [isRemoveMemberDialogOpen, setIsRemoveMemberDialogOpen] =
    useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  // Safe actions
  const { executeAsync: executeRemoveMember, status: removeMemberStatus } =
    useAction(removeMemberAction);
  const {
    executeAsync: executeUpdateMemberRole,
    status: updateMemberRoleStatus,
  } = useAction(updateMemberRoleAction);

  const isRemovingMember = removeMemberStatus === 'executing';
  const isUpdatingRole = updateMemberRoleStatus === 'executing';

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      const result = await executeRemoveMember({ memberId: memberToRemove.id });

      if (result?.data) {
        toast.success(
          `Successfully removed ${memberToRemove.name} from the organization`,
        );
        setIsRemoveMemberDialogOpen(false);
        setMemberToRemove(null);
      } else if (result?.serverError) {
        toast.error('Failed to remove member', {
          description: result.serverError,
        });
      }
    } catch (error) {
      toast.error('Failed to remove member', {
        description:
          error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  const handleUpdateMemberRole = async (
    memberId: string,
    newRole: 'admin' | 'owner' | 'member',
  ) => {
    try {
      const result = await executeUpdateMemberRole({
        memberId,
        role: newRole,
      });

      if (result?.data) {
        toast.success('Member role updated successfully');
      } else if (result?.serverError) {
        toast.error('Failed to update member role', {
          description: result.serverError,
        });
      }
    } catch (error) {
      toast.error('Failed to update member role', {
        description:
          error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  const openRemoveMemberDialog = (member: {
    id: string;
    user: {
      name?: string | null;
      email?: string | null;
    };
  }) => {
    setMemberToRemove({
      email: member.user.email || 'Unknown',
      id: member.id,
      name: member.user.name || member.user.email || 'Unknown',
    });
    setIsRemoveMemberDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Organization Members</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div className="flex items-center justify-between" key={i}>
                  <div className="flex items-center gap-3 border-l-2 border-secondary">
                    <Skeleton className="h-4 w-32 ml-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {members?.map((member) => (
                <div
                  className="flex items-center justify-between"
                  key={member.id}
                >
                  <div className="flex items-center gap-3 border-l-2 border-secondary">
                    <span className="text-sm pl-2">{member.user.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {member.user.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      disabled={isUpdatingRole || member.userId === user?.id}
                      onValueChange={(value) =>
                        handleUpdateMemberRole(
                          member.id,
                          value as 'admin' | 'owner' | 'member',
                        )
                      }
                      value={member.role}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                    {member.userId !== user?.id && (
                      <MetricButton
                        metric="organization_members_remove_member_clicked"
                        onClick={() => openRemoveMemberDialog(member)}
                        size="sm"
                        variant="destructive"
                      >
                        Remove
                      </MetricButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RemoveMemberDialog
        isOpen={isRemoveMemberDialogOpen}
        isRemoving={isRemovingMember}
        memberToRemove={memberToRemove}
        onClose={() => setIsRemoveMemberDialogOpen(false)}
        onConfirm={handleRemoveMember}
      />
    </>
  );
}
