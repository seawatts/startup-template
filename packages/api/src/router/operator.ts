import { ORPCError } from '@orpc/server';
import { ApiKeys, ApiKeyUsage } from '@seawatts/db/schema/api-keys';
import { OrgMembers, Orgs } from '@seawatts/db/schema/organizations';
import { Users } from '@seawatts/db/schema/users';
import { inTransaction } from '@seawatts/db/transaction';
import { and, desc, eq, ilike, not, sql } from 'drizzle-orm';
import { z } from 'zod';
import { isOperator, operatorProcedure } from '../operator/access';
import {
  internalOrganization,
  internalPerson,
} from '../operator/internal-rules';
import { protectedProcedure } from '../orpc';

// The operator console's reads. Organizations first: an organization, then
// its people and what it uses. Each list is one query (counts are subqueries,
// not a query per row), bounded, and leaves our own accounts out unless
// `includeInternal` is on. Never return a secret (an API key's value).

const scope = z.object({ includeInternal: z.boolean().default(false) });

const count = (query: ReturnType<typeof sql>) => sql<number>`(${query})::int`;
// The organization id spelled out with its table: inside a subquery a bare
// "id" would mean the subquery's own table.
const orgId = sql`${Orgs}."id"`;

export const operatorRouter = {
  // Whether to show the Internal link. Says nothing else.
  access: protectedProcedure
    .route({ method: 'GET' })
    .handler(async ({ context }) => ({
      operator: !context.apiKey && (await isOperator(context.user)),
    })),

  organization: operatorProcedure
    .input(z.object({ id: z.string() }))
    .route({ method: 'GET' })
    .handler(({ input }) =>
      inTransaction(async (tx) => {
        const [[organization], members, apiKeys] = await Promise.all([
          tx
            .select({
              createdAt: Orgs.createdAt,
              id: Orgs.id,
              internal: internalOrganization(orgId),
              name: Orgs.name,
              subscription: Orgs.stripeSubscriptionStatus,
            })
            .from(Orgs)
            .where(eq(Orgs.id, input.id))
            .limit(1),
          tx
            .select({
              email: Users.email,
              id: Users.id,
              joinedAt: OrgMembers.createdAt,
              name: Users.name,
              role: OrgMembers.role,
            })
            .from(OrgMembers)
            .innerJoin(Users, eq(Users.id, OrgMembers.userId))
            .where(eq(OrgMembers.organizationId, input.id))
            .orderBy(OrgMembers.createdAt)
            .limit(200),
          tx
            .select({
              active: ApiKeys.isActive,
              createdAt: ApiKeys.createdAt,
              expiresAt: ApiKeys.expiresAt,
              id: ApiKeys.id,
              lastUsedAt: ApiKeys.lastUsedAt,
              name: ApiKeys.name,
            })
            .from(ApiKeys)
            .where(eq(ApiKeys.organizationId, input.id))
            .orderBy(desc(ApiKeys.createdAt))
            .limit(100),
        ]);
        if (!organization)
          throw new ORPCError('NOT_FOUND', {
            message: 'Organization not found',
          });
        return { apiKeys, members, organization };
      }),
    ),

  organizations: operatorProcedure
    .input(
      scope.extend({
        limit: z.number().int().min(1).max(100).default(50),
        search: z.string().trim().max(100).optional(),
      }),
    )
    .route({ method: 'GET' })
    .handler(({ context, input }) =>
      context.db
        .select({
          apiKeys: count(
            sql`select count(*) from ${ApiKeys} k where k."organizationId" = ${orgId}`,
          ),
          createdAt: Orgs.createdAt,
          id: Orgs.id,
          internal: internalOrganization(orgId),
          lastApiUse: sql<Date | null>`(select max(k."lastUsedAt") from ${ApiKeys} k where k."organizationId" = ${orgId})`,
          members: count(
            sql`select count(*) from ${OrgMembers} m where m."organizationId" = ${orgId}`,
          ),
          name: Orgs.name,
          subscription: Orgs.stripeSubscriptionStatus,
        })
        .from(Orgs)
        .where(
          and(
            input.includeInternal
              ? undefined
              : not(internalOrganization(orgId)),
            input.search
              ? ilike(Orgs.name, `%${input.search.replace(/[%_\\]/g, '\\$&')}%`)
              : undefined,
          ),
        )
        .orderBy(desc(Orgs.createdAt))
        .limit(input.limit),
    ),

  overview: operatorProcedure
    .input(scope)
    .route({ method: 'GET' })
    .handler(async ({ context, input }) => {
      const customers = input.includeInternal
        ? sql`true`
        : not(internalOrganization(orgId));
      const people = input.includeInternal ? sql`true` : not(internalPerson());
      const week = sql`now() - interval '7 days'`;
      // One statement: each figure is a scalar subquery.
      const [row] = await context.db.execute<{
        active_api_keys: number;
        api_calls_week: number;
        new_organizations_week: number;
        organizations: number;
        people: number;
      }>(sql`
        select
          (select count(*) from ${Orgs} where ${customers})::int as organizations,
          (select count(*) from ${Orgs} where ${customers} and ${Orgs.createdAt} >= ${week})::int as new_organizations_week,
          (select count(*) from ${Users} where ${people})::int as people,
          (select count(*) from ${ApiKeys} join ${Orgs} on ${Orgs.id} = ${ApiKeys.organizationId}
            where ${ApiKeys.isActive} and ${customers})::int as active_api_keys,
          (select count(*) from ${ApiKeyUsage} join ${Orgs} on ${Orgs.id} = ${ApiKeyUsage.organizationId}
            where ${ApiKeyUsage.createdAt} >= ${week} and ${customers})::int as api_calls_week
      `);
      return {
        activeApiKeys: row?.active_api_keys ?? 0,
        apiCallsWeek: row?.api_calls_week ?? 0,
        newOrganizationsWeek: row?.new_organizations_week ?? 0,
        organizations: row?.organizations ?? 0,
        people: row?.people ?? 0,
      };
    }),
};
