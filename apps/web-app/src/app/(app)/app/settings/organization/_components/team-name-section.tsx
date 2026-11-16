'use client';

import { MetricButton } from '@seawatts/analytics/components';
import { useORPC } from '@seawatts/api/react/react';
import { useActiveOrganization } from '@seawatts/auth/client';
import { Card, CardContent, CardHeader, CardTitle } from '@seawatts/ui/card';
import { Input } from '@seawatts/ui/input';
import { toast } from '@seawatts/ui/sonner';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export function TeamNameSection() {
  const { data: activeOrg } = useActiveOrganization();
  const [name, setName] = useState(activeOrg?.name || 'Personal');

  useEffect(() => {
    if (activeOrg) {
      setName(activeOrg.name);
    }
  }, [activeOrg]);

  const api = useORPC();
  const rename = useMutation(api.org.updateName.mutationOptions());
  const isUpdating = rename.isPending;

  const handleUpdateName = async () => {
    if (!name.trim() || name === activeOrg?.name) return;

    try {
      await rename.mutateAsync({ name: name.trim() });
      toast.success('Organization name updated successfully');
    } catch (error) {
      toast.error('Failed to update organization name', {
        description:
          error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUpdateName();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Name</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              disabled={isUpdating}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              value={name}
            />
          </div>
          <MetricButton
            disabled={isUpdating || !name.trim() || name === activeOrg?.name}
            metric="team_name_section_update_clicked"
            onClick={handleUpdateName}
          >
            {isUpdating ? 'Updating...' : 'Update Name'}
          </MetricButton>
        </div>
      </CardContent>
    </Card>
  );
}
