import { subDays } from 'date-fns';
import { seed } from 'drizzle-seed';

import { db } from './client';
import { ApiKeys, ApiKeyUsage, AuthCodes } from './schema/api-keys';
import { OrgMembers, Orgs } from './schema/organizations';
import { Users } from './schema/users';

// Reset all tables

await db.delete(Users);
await db.delete(Orgs);
await db.delete(OrgMembers);
await db.delete(AuthCodes);
await db.delete(ApiKeyUsage);
await db.delete(ApiKeys);

const userId = 'user_30oVYOGDYUTdXqB6HImz3XbRyTs';
const orgId = 'org_30oVYhhebEP3q4dSFlxo8DyAxhr';
const orgName = 'seawatts';
const apiKeyId = 'ak_seawatts';
const stripeCustomerId = 'cus_Snv28tYxHudPzx';
const stripeSubscriptionId = 'sub_1RsJCH4hM6DbRRtOGcENjqIO';

await seed(db, {
  ApiKeys,
  ApiKeyUsage,
  OrgMembers,
  Orgs,
  Users,
}).refine((funcs) => ({
  ApiKeys: {
    columns: {
      id: funcs.default({ defaultValue: apiKeyId }),
      key: funcs.default({
        defaultValue: 'usk-live-300nYp2JItCuoiHhaioQv82QHwo',
      }),
      orgId: funcs.default({ defaultValue: orgId }),
    },
    count: 1,
  },
  ApiKeyUsage: {
    columns: {
      apiKeyId: funcs.default({
        defaultValue: apiKeyId,
      }),
      createdAt: funcs.date({
        maxDate: new Date(),
        minDate: subDays(new Date(), 5),
      }),
      metadata: funcs.default({
        defaultValue: {},
      }),
      orgId: funcs.default({ defaultValue: orgId }),
      type: funcs.valuesFromArray({
        values: ['mcp-server'],
      }),
      userId: funcs.default({
        defaultValue: userId,
      }),
    },
    count: 10,
  },
  OrgMembers: {
    columns: {
      orgId: funcs.default({ defaultValue: orgId }),
      userId: funcs.default({
        defaultValue: userId,
      }),
    },
    count: 1,
  },
  Orgs: {
    columns: {
      id: funcs.default({ defaultValue: orgId }),
      name: funcs.default({ defaultValue: orgName }),
      stripeCustomerId: funcs.default({ defaultValue: stripeCustomerId }),
      stripeSubscriptionId: funcs.default({
        defaultValue: stripeSubscriptionId,
      }),
      stripeSubscriptionStatus: funcs.default({
        defaultValue: 'active',
      }),
    },
    count: 1,
  },
  Users: {
    columns: {
      email: funcs.default({ defaultValue: 'chris.watts.t@gmail.com' }),
      firstName: funcs.default({ defaultValue: 'Chris' }),
      id: funcs.default({ defaultValue: userId }),
      lastName: funcs.default({ defaultValue: 'Watts' }),
      online: funcs.boolean(),
    },
    count: 1,
  },
}));

process.exit(0);
