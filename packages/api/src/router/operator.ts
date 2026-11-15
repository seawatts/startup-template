import { ORPCError } from '@orpc/server';
import { authDb } from '@seawatts/db/auth-client';
import { db } from '@seawatts/db/client';
import { ApiKeys } from '@seawatts/db/schema/api-keys';
import { OrgMembers, Orgs } from '@seawatts/db/schema/organizations';
import { Users } from '@seawatts/db/schema/users';
import { inTenant, inTransaction } from '@seawatts/db/transaction';
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
//
// Organizations and people are read as the auth role. What an organization
// uses lives in tenant tables, which no query can read across organizations:
// one organization's rows are read inside that organization (`inTenant`),
// and figures across organizations come from two database functions that
// return counts and dates only (migration 0002).

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
    .handler(async ({ input }) => {
      const [[[organization], members], apiKeys] = await Promise.all([
        inTransaction(
          (tx) =>
            Promise.all([
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
            ]),
          { client: authDb },
        ),
        inTenant(input.id, (tx) =>
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
        ),
      ]);
      if (!organization)
        throw new ORPCError('NOT_FOUND', {
          message: 'Organization not found',
        });
      return { apiKeys, members, organization };
    }),

  organizations: operatorProcedure
    .input(
      scope.extend({
        limit: z.number().int().min(1).max(100).default(50),
        search: z.string().trim().max(100).optional(),
      }),
    )
    .route({ method: 'GET' })
    .handler(async ({ input }) => {
      const organizations = await authDb
        .select({
          createdAt: Orgs.createdAt,
          id: Orgs.id,
          internal: internalOrganization(orgId),
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
        .limit(input.limit);
      if (organizations.length === 0) return [];
      // One more statement for the whole page, not one per organization.
      const ids = sql`array[${sql.join(
        organizations.map((organization) => sql`${organization.id}`),
        sql`, `,
      )}]::text[]`;
      const usage = await db.execute<{
        api_keys: number;
        last_api_use: Date | null;
        organization_id: string;
      }>(sql`select * from "startup_template".operator_api_usage(${ids})`);
      const byOrganization = new Map(
        usage.map((row) => [row.organization_id, row]),
      );
      return organizations.map((organization) => ({
        ...organization,
        apiKeys: byOrganization.get(organization.id)?.api_keys ?? 0,
        lastApiUse: byOrganization.get(organization.id)?.last_api_use ?? null,
      }));
    }),

  overview: operatorProcedure
    .input(scope)
    .route({ method: 'GET' })
    .handler(async ({ input }) => {
      const customers = input.includeInternal
        ? sql`true`
        : not(internalOrganization(orgId));
      const people = input.includeInternal ? sql`true` : not(internalPerson());
      const week = sql`now() - interval '7 days'`;
      // One statement as the auth role: each figure is a scalar subquery.
      // Our own organizations (a handful) come back by id, so the usage
      // totals can leave them out.
      const [row] = await authDb.execute<{
        internal_organizations: string[];
        new_organizations_week: number;
        organizations: number;
        people: number;
      }>(sql`
        select
          (select count(*) from ${Orgs} where ${customers})::int as organizations,
          (select count(*) from ${Orgs} where ${customers} and ${Orgs.createdAt} >= ${week})::int as new_organizations_week,
          (select count(*) from ${Users} where ${people})::int as people,
          array(select ${Orgs.id}::text from ${Orgs} where ${
            input.includeInternal ? sql`false` : internalOrganization(orgId)
          }) as internal_organizations
      `);
      const internal = row?.internal_organizations ?? [];
      const excluded =
        internal.length > 0
          ? sql`array[${sql.join(
              internal.map((id) => sql`${id}`),
              sql`, `,
            )}]::text[]`
          : sql`'{}'::text[]`;
      const [usage] = await db.execute<{
        active_api_keys: number;
        api_calls: number;
      }>(
        sql`select * from "startup_template".operator_api_totals(${excluded}, ${week})`,
      );
      return {
        activeApiKeys: usage?.active_api_keys ?? 0,
        apiCallsWeek: usage?.api_calls ?? 0,
        newOrganizationsWeek: row?.new_organizations_week ?? 0,
        organizations: row?.organizations ?? 0,
        people: row?.people ?? 0,
      };
    }),
};
