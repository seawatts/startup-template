'use client';

import { useORPC } from '@seawatts/api/react/react';
import { Badge } from '@seawatts/ui/badge';
import { Button } from '@seawatts/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@seawatts/ui/dropdown-menu';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@seawatts/ui/empty';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@seawatts/ui/item';
import { Skeleton } from '@seawatts/ui/skeleton';
import { toast } from '@seawatts/ui/sonner';
import { Switch } from '@seawatts/ui/switch';
import { IconDots } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function LinksList() {
  const api = useORPC();
  const queryClient = useQueryClient();
  const listOptions = api.links.list.queryOptions({ input: {} });
  const links = useQuery(listOptions);

  // One-click controls update the row at once; a failure reloads the list.
  const setActive = useMutation(
    api.links.setActive.mutationOptions({
      onError: (error) => {
        queryClient.invalidateQueries({ queryKey: listOptions.queryKey });
        toast.error('The link was not changed', {
          description: error.message,
        });
      },
      onMutate: async ({ active, id }) => {
        await queryClient.cancelQueries({ queryKey: listOptions.queryKey });
        queryClient.setQueryData(listOptions.queryKey, (rows) =>
          rows?.map((row) =>
            row.id === id ? { ...row, isActive: active } : row,
          ),
        );
      },
    }),
  );
  const remove = useMutation(
    api.links.delete.mutationOptions({
      onError: (error) =>
        toast.error('The link was not deleted', {
          description: error.message,
        }),
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: api.links.list.key() }),
    }),
  );

  if (links.isPending)
    return (
      <ItemGroup className="gap-2" data-testid="links-loading">
        {['a', 'b', 'c'].map((key) => (
          <Skeleton className="h-16 w-full rounded-md" key={key} />
        ))}
      </ItemGroup>
    );

  if (links.isError)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Links could not be loaded</EmptyTitle>
          <EmptyDescription>{links.error.message}</EmptyDescription>
        </EmptyHeader>
        <Button onClick={() => links.refetch()} variant="secondary">
          Try again
        </Button>
      </Empty>
    );

  if (links.data.length === 0)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>No links yet</EmptyTitle>
          <EmptyDescription>
            Make one above. It works from the API, the CLI and MCP too.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  const addressOf = (code: string) => `${window.location.origin}/s/${code}`;

  return (
    <ItemGroup className="gap-2">
      {links.data.map((link) => (
        <Item data-testid="link-row" key={link.id} variant="outline">
          <ItemContent className="min-w-0">
            <ItemTitle className="max-w-full font-mono text-foreground">
              <span className="truncate">/s/{link.code}</span>
              {link.isActive ? null : <Badge variant="secondary">Off</Badge>}
            </ItemTitle>
            <ItemDescription className="truncate">
              {link.redirectUrl}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Switch
              aria-label={`Link /s/${link.code} is ${link.isActive ? 'on' : 'off'}`}
              checked={link.isActive}
              onCheckedChange={(active) =>
                setActive.mutate({ active, id: link.id })
              }
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={`More for /s/${link.code}`}
                  size="icon"
                  variant="ghost"
                >
                  <IconDots />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    void navigator.clipboard.writeText(addressOf(link.code));
                    toast.success('Link copied');
                  }}
                >
                  Copy link
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => remove.mutate({ id: link.id })}
                  variant="destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  );
}
