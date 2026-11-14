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
import { Input } from '@seawatts/ui/input';
import { Label } from '@seawatts/ui/label';
import { Skeleton } from '@seawatts/ui/skeleton';
import { Switch } from '@seawatts/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@seawatts/ui/table';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useDeferredValue, useId, useState } from 'react';
import { day, number } from './format';

export function Console() {
  const [includeInternal, setIncludeInternal] = useState(false);
  const [search, setSearch] = useState('');
  const switchId = useId();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Switch
          checked={includeInternal}
          id={switchId}
          onCheckedChange={setIncludeInternal}
        />
        <Label htmlFor={switchId}>Include internal</Label>
      </div>
      <Overview includeInternal={includeInternal} />
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Organizations</h2>
          <Input
            aria-label="Search organizations"
            className="sm:max-w-xs"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name"
            type="search"
            value={search}
          />
        </div>
        <Organizations
          includeInternal={includeInternal}
          search={useDeferredValue(search.trim())}
        />
      </div>
    </div>
  );
}

const figures = [
  ['organizations', 'Organizations'],
  ['newOrganizationsWeek', 'New this week'],
  ['people', 'People'],
  ['activeApiKeys', 'Active API keys'],
  ['apiCallsWeek', 'API calls this week'],
] as const;

function Overview({ includeInternal }: { includeInternal: boolean }) {
  const api = useORPC();
  const overview = useQuery(
    api.operator.overview.queryOptions({
      input: { includeInternal },
      placeholderData: keepPreviousData,
    }),
  );
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {figures.map(([key, label]) => (
        <Card className="gap-2 py-4" key={key}>
          <CardHeader className="px-4">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 text-2xl font-semibold tabular-nums">
            {overview.data ? (
              number(overview.data[key])
            ) : overview.isError ? (
              <span className="text-sm font-normal text-destructive">
                Could not load
              </span>
            ) : (
              <Skeleton className="h-8 w-16" />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Organizations({
  includeInternal,
  search,
}: {
  includeInternal: boolean;
  search: string;
}) {
  const api = useORPC();
  const organizations = useQuery(
    api.operator.organizations.queryOptions({
      input: { includeInternal, ...(search ? { search } : {}) },
      placeholderData: keepPreviousData,
    }),
  );
  if (organizations.isError)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Could not load organizations</EmptyTitle>
          <EmptyDescription>Reload the page to try again.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  const rows = organizations.data;
  if (rows?.length === 0)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>
            {search ? 'No organization matches' : 'No organizations yet'}
          </EmptyTitle>
          <EmptyDescription>
            {search
              ? 'Try another name, or include internal organizations.'
              : 'The first one appears here when someone signs up.'}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return (
    <>
      {/* Phone: one tappable row per organization. */}
      <ul className="divide-y rounded-lg border md:hidden">
        {rows
          ? rows.map((row) => (
              <li key={row.id}>
                <Link
                  className="flex items-center justify-between gap-3 p-3 active:bg-muted"
                  href={`/app/internal/${row.id}`}
                >
                  <span className="min-w-0 space-y-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{row.name}</span>
                      {row.internal && (
                        <Badge variant="secondary">Internal</Badge>
                      )}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {number(row.members)}{' '}
                      {row.members === 1 ? 'person' : 'people'} · joined{' '}
                      {day(row.createdAt)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm text-muted-foreground">
                    {row.lastApiUse ? day(row.lastApiUse) : 'No API use'}
                  </span>
                </Link>
              </li>
            ))
          : [0, 1, 2].map((row) => (
              <li className="space-y-2 p-3" key={row}>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </li>
            ))}
      </ul>
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">People</TableHead>
              <TableHead className="text-right">API keys</TableHead>
              <TableHead>Last API use</TableHead>
              <TableHead>Plan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows
              ? rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <Link
                          className="font-medium underline-offset-4 hover:underline"
                          href={`/app/internal/${row.id}`}
                        >
                          {row.name}
                        </Link>
                        {row.internal && (
                          <Badge variant="secondary">Internal</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>{day(row.createdAt)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {number(row.members)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {number(row.apiKeys)}
                    </TableCell>
                    <TableCell>
                      {row.lastApiUse ? day(row.lastApiUse) : 'Never'}
                    </TableCell>
                    <TableCell className="capitalize">
                      {row.subscription?.replaceAll('_', ' ') ?? 'Free'}
                    </TableCell>
                  </TableRow>
                ))
              : [0, 1, 2].map((row) => (
                  <TableRow key={row}>
                    {[40, 24, 8, 8, 24, 16].map((width, cell) => (
                      <TableCell key={cell}>
                        <Skeleton
                          className="h-5"
                          style={{ width: `${width * 4}px` }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
