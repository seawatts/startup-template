'use client';

import { useORPC } from '@seawatts/api/react/react';
import { Badge } from '@seawatts/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@seawatts/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@seawatts/ui/empty';
import { Skeleton } from '@seawatts/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { day } from './format';

// What staff need about one customer. A feature adds its card here.
export function Organization({ id }: { id: string }) {
  const api = useORPC();
  const query = useQuery(
    api.operator.organization.queryOptions({ input: { id }, retry: false }),
  );
  if (query.isError)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Organization not found</EmptyTitle>
          <EmptyDescription>
            It may have been deleted, or the address is wrong.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  const data = query.data;
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {data ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words text-2xl font-bold">
                {data.organization.name}
              </h1>
              {data.organization.internal && (
                <Badge variant="secondary">Internal</Badge>
              )}
              <Badge className="capitalize" variant="outline">
                {data.organization.subscription?.replaceAll('_', ' ') ?? 'Free'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Joined {day(data.organization.createdAt)}
            </p>
          </>
        ) : (
          <>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-32" />
          </>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>People</CardTitle>
          </CardHeader>
          <CardContent>
            {data ? (
              <ul className="divide-y">
                {data.members.map((member) => (
                  <li
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    key={member.id}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {member.name}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {member.email}
                      </span>
                    </span>
                    <Badge className="shrink-0 capitalize" variant="outline">
                      {member.role}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <Rows />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>API keys</CardTitle>
          </CardHeader>
          <CardContent>
            {!data ? (
              <Rows />
            ) : data.apiKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">No API keys yet.</p>
            ) : (
              <ul className="divide-y">
                {data.apiKeys.map((key) => (
                  <li
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    key={key.id}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {key.name}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {key.lastUsedAt
                          ? `Last used ${day(key.lastUsedAt)}`
                          : 'Never used'}
                      </span>
                    </span>
                    <Badge
                      className="shrink-0"
                      variant={key.active ? 'outline' : 'secondary'}
                    >
                      {key.active ? 'Active' : 'Off'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Rows() {
  return (
    <div className="space-y-3">
      {[0, 1].map((row) => (
        <div className="space-y-2" key={row}>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      ))}
    </div>
  );
}
