import { createId } from '@seawatts/id';
import { relations } from 'drizzle-orm';
import {
  boolean,
  json,
  pgSchema,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

export const schema = pgSchema('startup_template');

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = schema.enum('userRole', [
  'admin',
  'owner',
  'member',
]);
export const localConnectionStatusEnum = schema.enum('localConnectionStatus', [
  'connected',
  'disconnected',
]);
export const stripeSubscriptionStatusEnum = schema.enum(
  'stripeSubscriptionStatus',
  [
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'paused',
    'trialing',
    'unpaid',
  ],
);
export const apiKeyUsageTypeEnum = schema.enum('apiKeyUsageType', [
  'mcp-server',
]);
export const invitationStatusEnum = schema.enum('invitationStatus', [
  'pending',
  'accepted',
  'rejected',
  'canceled',
]);

export const UserRoleType = z.enum(userRoleEnum.enumValues).enum;
export const LocalConnectionStatusType = z.enum(
  localConnectionStatusEnum.enumValues,
).enum;
export const StripeSubscriptionStatusType = z.enum(
  stripeSubscriptionStatusEnum.enumValues,
).enum;
export const ApiKeyUsageTypeType = z.enum(apiKeyUsageTypeEnum.enumValues).enum;
export const InvitationStatusType = z.enum(
  invitationStatusEnum.enumValues,
).enum;

// ============================================================================
// BETTER AUTH TABLES
// ============================================================================

// Users table - Better Auth compatible
export const Users = schema.table('user', {
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').default(false).notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'user' }))
    .notNull()
    .primaryKey(),
  image: text('image'),
  name: text('name').notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
});

export const UsersRelations = relations(Users, ({ many }) => ({
  accounts: many(Accounts),
  apiKeys: many(ApiKeys),
  apiKeyUsage: many(ApiKeyUsage),
  authCodes: many(AuthCodes),
  orgMembers: many(OrgMembers),
  sessions: many(Sessions),
}));

export type UserType = typeof Users.$inferSelect;

export const CreateUserSchema = createInsertSchema(Users).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

// Sessions table - Better Auth required
export const Sessions = schema.table('session', {
  // Organization context - Better Auth organization plugin
  activeOrganizationId: varchar('activeOrganizationId', {
    length: 128,
  }).references(() => Orgs.id, { onDelete: 'set null' }),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp('expiresAt', {
    mode: 'date',
    withTimezone: true,
  }).notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'sess' }))
    .notNull()
    .primaryKey(),
  ipAddress: text('ipAddress'),
  token: text('token').notNull().unique(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userAgent: text('userAgent'),
  userId: varchar('userId', { length: 128 })
    .references(() => Users.id, { onDelete: 'cascade' })
    .notNull(),
});

export const SessionsRelations = relations(Sessions, ({ one }) => ({
  activeOrganization: one(Orgs, {
    fields: [Sessions.activeOrganizationId],
    references: [Orgs.id],
  }),
  user: one(Users, {
    fields: [Sessions.userId],
    references: [Users.id],
  }),
}));

export type SessionType = typeof Sessions.$inferSelect;

// Accounts table - Better Auth OAuth providers
export const Accounts = schema.table('account', {
  accessToken: text('accessToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', {
    mode: 'date',
    withTimezone: true,
  }),
  accountId: text('accountId').notNull(),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'acc' }))
    .notNull()
    .primaryKey(),
  idToken: text('idToken'),
  password: text('password'),
  providerId: text('providerId').notNull(),
  refreshToken: text('refreshToken'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', {
    mode: 'date',
    withTimezone: true,
  }),
  scope: text('scope'),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userId: varchar('userId', { length: 128 })
    .references(() => Users.id, { onDelete: 'cascade' })
    .notNull(),
});

export const AccountsRelations = relations(Accounts, ({ one }) => ({
  user: one(Users, {
    fields: [Accounts.userId],
    references: [Users.id],
  }),
}));

export type AccountType = typeof Accounts.$inferSelect;

// Verifications table - Better Auth email verification
export const Verifications = schema.table('verification', {
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp('expiresAt', {
    mode: 'date',
    withTimezone: true,
  }).notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'ver' }))
    .notNull()
    .primaryKey(),
  identifier: text('identifier').notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  value: text('value').notNull(),
});

export type VerificationType = typeof Verifications.$inferSelect;

// ============================================================================
// ORGANIZATION TABLES
// ============================================================================

// Organizations table - Better Auth organization plugin compatible
export const Orgs = schema.table('organization', {
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'org' }))
    .notNull()
    .primaryKey(),
  logo: text('logo'),
  metadata: json('metadata').$type<Record<string, unknown>>(),
  name: text('name').notNull(),
  slug: text('slug').unique(),
  // Stripe fields
  stripeCustomerId: text('stripeCustomerId'),
  stripeSubscriptionId: text('stripeSubscriptionId'),
  stripeSubscriptionStatus: stripeSubscriptionStatusEnum(
    'stripeSubscriptionStatus',
  ),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
});

export type OrgType = typeof Orgs.$inferSelect;

export const updateOrgSchema = createInsertSchema(Orgs).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export const OrgsRelations = relations(Orgs, ({ many }) => ({
  apiKeys: many(ApiKeys),
  apiKeyUsage: many(ApiKeyUsage),
  authCodes: many(AuthCodes),
  invitations: many(Invitations),
  members: many(OrgMembers),
  sessions: many(Sessions),
}));

// Organization Members table - Better Auth organization plugin compatible
export const OrgMembers = schema.table(
  'member',
  {
    createdAt: timestamp('createdAt', {
      mode: 'date',
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    id: varchar('id', { length: 128 })
      .$defaultFn(() => createId({ prefix: 'member' }))
      .notNull()
      .primaryKey(),
    organizationId: varchar('organizationId', { length: 128 })
      .references(() => Orgs.id, { onDelete: 'cascade' })
      .notNull(),
    role: userRoleEnum('role').default('member').notNull(),
    userId: varchar('userId', { length: 128 })
      .references(() => Users.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [unique().on(table.userId, table.organizationId)],
);

export type OrgMembersType = typeof OrgMembers.$inferSelect & {
  user?: UserType;
  organization?: OrgType;
};

export const OrgMembersRelations = relations(OrgMembers, ({ one }) => ({
  organization: one(Orgs, {
    fields: [OrgMembers.organizationId],
    references: [Orgs.id],
  }),
  user: one(Users, {
    fields: [OrgMembers.userId],
    references: [Users.id],
  }),
}));

// Invitations table - Better Auth organization plugin
export const Invitations = schema.table('invitation', {
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  email: text('email').notNull(),
  expiresAt: timestamp('expiresAt', {
    mode: 'date',
    withTimezone: true,
  }).notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'inv' }))
    .notNull()
    .primaryKey(),
  inviterId: varchar('inviterId', { length: 128 })
    .references(() => Users.id, { onDelete: 'cascade' })
    .notNull(),
  organizationId: varchar('organizationId', { length: 128 })
    .references(() => Orgs.id, { onDelete: 'cascade' })
    .notNull(),
  role: userRoleEnum('role').default('member').notNull(),
  status: invitationStatusEnum('status').default('pending').notNull(),
});

export type InvitationType = typeof Invitations.$inferSelect;

export const InvitationsRelations = relations(Invitations, ({ one }) => ({
  inviter: one(Users, {
    fields: [Invitations.inviterId],
    references: [Users.id],
  }),
  organization: one(Orgs, {
    fields: [Invitations.organizationId],
    references: [Orgs.id],
  }),
}));

// ============================================================================
// APPLICATION-SPECIFIC TABLES
// ============================================================================

// Auth Codes table (for CLI authentication)
export const AuthCodes = schema.table('authCodes', {
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp('expiresAt', {
    mode: 'date',
    withTimezone: true,
  })
    .$defaultFn(() => new Date(Date.now() + 1000 * 60 * 30)) // 30 minutes
    .notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'ac' }))
    .notNull()
    .primaryKey(),
  organizationId: varchar('organizationId', { length: 128 })
    .references(() => Orgs.id, { onDelete: 'cascade' })
    .notNull(),
  sessionId: text('sessionId').notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  usedAt: timestamp('usedAt', {
    mode: 'date',
    withTimezone: true,
  }),
  userId: varchar('userId', { length: 128 })
    .references(() => Users.id, { onDelete: 'cascade' })
    .notNull(),
});

export type AuthCodeType = typeof AuthCodes.$inferSelect;

export const AuthCodesRelations = relations(AuthCodes, ({ one }) => ({
  organization: one(Orgs, {
    fields: [AuthCodes.organizationId],
    references: [Orgs.id],
  }),
  user: one(Users, {
    fields: [AuthCodes.userId],
    references: [Users.id],
  }),
}));

// API Keys Table
export const ApiKeys = schema.table('apiKeys', {
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp('expiresAt', {
    mode: 'date',
    withTimezone: true,
  }),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'ak' }))
    .notNull()
    .primaryKey(),
  isActive: boolean('isActive').notNull().default(true),
  key: text('key')
    .notNull()
    .unique()
    .$defaultFn(() => createId({ prefix: 'usk', prefixSeparator: '-live-' })),
  lastUsedAt: timestamp('lastUsedAt', {
    mode: 'date',
    withTimezone: true,
  }),
  name: text('name').notNull(),
  organizationId: varchar('organizationId', { length: 128 })
    .references(() => Orgs.id, { onDelete: 'cascade' })
    .notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userId: varchar('userId', { length: 128 })
    .references(() => Users.id, { onDelete: 'cascade' })
    .notNull(),
});

export type ApiKeyType = typeof ApiKeys.$inferSelect;

export const CreateApiKeySchema = createInsertSchema(ApiKeys).omit({
  createdAt: true,
  id: true,
  lastUsedAt: true,
  organizationId: true,
  updatedAt: true,
  userId: true,
});

export const UpdateApiKeySchema = createUpdateSchema(ApiKeys).omit({
  createdAt: true,
  id: true,
  organizationId: true,
  updatedAt: true,
  userId: true,
});

export const ApiKeysRelations = relations(ApiKeys, ({ one, many }) => ({
  organization: one(Orgs, {
    fields: [ApiKeys.organizationId],
    references: [Orgs.id],
  }),
  usage: many(ApiKeyUsage),
  user: one(Users, {
    fields: [ApiKeys.userId],
    references: [Users.id],
  }),
}));

// API Key Usage Table
export const ApiKeyUsage = schema.table('apiKeyUsage', {
  apiKeyId: varchar('apiKeyId', { length: 128 })
    .references(() => ApiKeys.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'aku' }))
    .notNull()
    .primaryKey(),
  metadata: json('metadata').$type<Record<string, unknown>>(),
  organizationId: varchar('organizationId', { length: 128 })
    .references(() => Orgs.id, { onDelete: 'cascade' })
    .notNull(),
  type: apiKeyUsageTypeEnum('type').notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userId: varchar('userId', { length: 128 })
    .references(() => Users.id, { onDelete: 'cascade' })
    .notNull(),
});

export type ApiKeyUsageType = typeof ApiKeyUsage.$inferSelect;

export const CreateApiKeyUsageSchema = createInsertSchema(ApiKeyUsage).omit({
  createdAt: true,
  id: true,
  organizationId: true,
  updatedAt: true,
  userId: true,
});

export const ApiKeyUsageRelations = relations(ApiKeyUsage, ({ one }) => ({
  apiKey: one(ApiKeys, {
    fields: [ApiKeyUsage.apiKeyId],
    references: [ApiKeys.id],
  }),
  organization: one(Orgs, {
    fields: [ApiKeyUsage.organizationId],
    references: [Orgs.id],
  }),
  user: one(Users, {
    fields: [ApiKeyUsage.userId],
    references: [Users.id],
  }),
}));

// Short URLs Table
export const ShortUrls = schema.table('shortUrls', {
  code: varchar('code', { length: 128 }).notNull(),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp('expiresAt', {
    mode: 'date',
    withTimezone: true,
  }),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'shortUrl' }))
    .notNull()
    .primaryKey(),
  isActive: boolean('isActive').notNull().default(true),
  organizationId: varchar('organizationId', { length: 128 })
    .references(() => Orgs.id, { onDelete: 'cascade' })
    .notNull(),
  redirectUrl: text('redirectUrl').notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userId: varchar('userId', { length: 128 })
    .references(() => Users.id, { onDelete: 'cascade' })
    .notNull(),
});

export type ShortUrlType = typeof ShortUrls.$inferSelect;

export const CreateShortUrlSchema = createInsertSchema(ShortUrls).omit({
  createdAt: true,
  id: true,
  organizationId: true,
  updatedAt: true,
  userId: true,
});

export const UpdateShortUrlSchema = createUpdateSchema(ShortUrls).omit({
  createdAt: true,
  id: true,
  organizationId: true,
  updatedAt: true,
  userId: true,
});

export const ShortUrlsRelations = relations(ShortUrls, ({ one }) => ({
  organization: one(Orgs, {
    fields: [ShortUrls.organizationId],
    references: [Orgs.id],
  }),
  user: one(Users, {
    fields: [ShortUrls.userId],
    references: [Users.id],
  }),
}));
