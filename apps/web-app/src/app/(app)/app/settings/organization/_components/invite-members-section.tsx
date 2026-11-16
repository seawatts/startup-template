'use client';

import { MetricButton, MetricLink } from '@seawatts/analytics/components';
import { useORPC } from '@seawatts/api/react/react';
import { useActiveOrganization } from '@seawatts/auth/client';
import {
  Entitled,
  NotEntitled,
  useIsEntitled,
} from '@seawatts/stripe/guards/client';
import { Badge } from '@seawatts/ui/badge';
import { Button } from '@seawatts/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@seawatts/ui/card';
import { Input } from '@seawatts/ui/input';
import { Label } from '@seawatts/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@seawatts/ui/select';
import { toast } from '@seawatts/ui/sonner';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

// Type for invitation
interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
}

export function InviteMembersSection() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [isRevokingInvitation, setIsRevokingInvitation] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const { data: activeOrg } = useActiveOrganization();
  const isEntitledCheck = useIsEntitled('unlimited_developers');

  const api = useORPC();
  const invite = useMutation(api.orgMembers.invite.mutationOptions());
  const isInviting = invite.isPending;

  // Fetch invitations
  const fetchInvitations = useCallback(async () => {
    if (!activeOrg?.id) return;
    try {
      const response = await fetch(
        `/api/auth/organization/list-invitations?organizationId=${activeOrg.id}`,
      );
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!activeOrg) {
      toast.error('No organization found');
      return;
    }

    try {
      await invite.mutateAsync({ email: email.trim(), role });
      toast.success(`Invitation sent to ${email}`);
      setEmail('');
      setRole('member');
      fetchInvitations();
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error('Failed to send invitation', {
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      });
    }
  };

  const handleRevokeInvitation = async (
    invitationId: string,
    invitationEmail: string,
  ) => {
    setIsRevokingInvitation(true);

    try {
      await fetch('/api/auth/organization/cancel-invitation', {
        body: JSON.stringify({ invitationId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      toast.success(`Successfully revoked invitation for ${invitationEmail}`);
      fetchInvitations();
    } catch (error) {
      console.error('Failed to revoke invitation:', error);
      toast.error('Failed to revoke invitation', {
        description:
          error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsRevokingInvitation(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInvite();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Invite Members</CardTitle>
            <Badge className="text-xs" variant="secondary">
              Paid Plan Required
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 justify-between">
            <div className="flex-1 gap-2 grid">
              <Label htmlFor="email">Email</Label>
              <Input
                disabled={isInviting || !isEntitledCheck}
                id="email"
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="jane@example.com"
                value={email}
              />
            </div>
            <div className="w-fit gap-2 grid">
              <Label htmlFor="role">Role</Label>
              <Select
                disabled={isInviting || !isEntitledCheck}
                onValueChange={(value) => setRole(value as 'admin' | 'member')}
                value={role}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Entitled entitlement="unlimited_developers">
            <MetricButton
              disabled={isInviting || !email.trim()}
              metric="invite_members_section_invite_clicked"
              onClick={handleInvite}
              properties={{
                location: 'invite_members_section',
              }}
            >
              {isInviting ? 'Sending...' : 'Invite'}
            </MetricButton>
          </Entitled>
          <NotEntitled entitlement="unlimited_developers">
            <Button asChild>
              <MetricLink
                href="/app/settings/billing"
                metric="invite_members_section_upgrade_clicked"
                properties={{
                  destination: '/app/settings/billing',
                  location: 'invite_members_section',
                }}
              >
                Upgrade to invite members
              </MetricLink>
            </Button>
          </NotEntitled>
        </CardContent>
      </Card>

      {invitations && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div
                  className="flex items-center justify-between"
                  key={invitation.id}
                >
                  <div className="flex items-center gap-3 border-l-2 border-muted">
                    <span className="text-sm pl-2">{invitation.email}</span>
                    <span className="text-xs text-muted-foreground">
                      {invitation.role}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Invited{' '}
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MetricButton
                      disabled={isRevokingInvitation}
                      metric="invite_members_section_revoke_clicked"
                      onClick={() =>
                        handleRevokeInvitation(invitation.id, invitation.email)
                      }
                      properties={{
                        location: 'invite_members_section',
                      }}
                      size="sm"
                      variant="destructive"
                    >
                      Revoke
                    </MetricButton>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
