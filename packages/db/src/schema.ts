import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

import { createId } from '@acme/id';

export const userRoleEnum = pgEnum('userRole', ['admin', 'superAdmin', 'user']);

export const UserRoleType = z.enum(userRoleEnum.enumValues).Enum;

export const Users = pgTable('user', {
  avatarUrl: text('avatarUrl'),
  clerkId: text('clerkId').unique().notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  email: text('email').notNull(),
  firstName: text('firstName'),
  id: varchar('id', { length: 128 }).notNull().primaryKey(),
  lastLoggedInAt: timestamp('lastLoggedInAt', {
    mode: 'date',
    withTimezone: true,
  }),
  lastName: text('lastName'),
  online: boolean('online').default(false).notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
});

export const UsersRelations = relations(Users, ({ many }) => ({
  orgMembers: many(OrgMembers),
  authCodes: many(AuthCodes),
}));

export type UserType = typeof Users.$inferSelect;

export const CreateUserSchema = createInsertSchema(Users, {
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  online: z.boolean(),
}).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export const Orgs = pgTable('orgs', {
  clerkOrgId: text('clerkOrgId').unique().notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  }).defaultNow(),
  createdByUserId: varchar('createdByUserId')
    .references(() => Users.id, {
      onDelete: 'cascade',
    })
    .notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'org' }))
    .notNull()
    .primaryKey(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
});

export type OrgType = typeof Orgs.$inferSelect;

export const updateOrgSchema = createInsertSchema(Orgs, {}).omit({
  createdAt: true,
  createdByUserId: true,
  id: true,
  updatedAt: true,
});

export const OrgsRelations = relations(Orgs, ({ one, many }) => ({
  createdByUser: one(Users, {
    fields: [Orgs.createdByUserId],
    references: [Users.id],
  }),
  orgMembers: many(OrgMembers),
  authCodes: many(AuthCodes),
}));

// Company Members Table
export const OrgMembers = pgTable(
  'orgMembers',
  {
    createdAt: timestamp('createdAt', {
      mode: 'date',
      withTimezone: true,
    }).defaultNow(),
    userId: varchar('userId')
      .references(() => Users.id, {
        onDelete: 'cascade',
      })
      .notNull()
      .default(sql`auth.jwt()->>'sub'`),
    id: varchar('id', { length: 128 })
      .$defaultFn(() => createId({ prefix: 'member' }))
      .notNull()
      .primaryKey(),
    orgId: varchar('orgId')
      .references(() => Orgs.id, {
        onDelete: 'cascade',
      })
      .notNull()
      .default(sql`auth.jwt()->>'org_id'`),
    role: userRoleEnum('role').default('user').notNull(),
    updatedAt: timestamp('updatedAt', {
      mode: 'date',
      withTimezone: true,
    }).$onUpdateFn(() => new Date()),
  },
  (table) => [
    // Add unique constraint for userId and orgId combination using the simpler syntax
    unique().on(table.userId, table.orgId),
  ],
);

export type OrgMembersType = typeof OrgMembers.$inferSelect & {
  user?: UserType;
  org?: OrgType;
};

export const OrgMembersRelations = relations(OrgMembers, ({ one }) => ({
  user: one(Users, {
    fields: [OrgMembers.userId],
    references: [Users.id],
  }),
  org: one(Orgs, {
    fields: [OrgMembers.orgId],
    references: [Orgs.id],
  }),
}));

export const ShortUrl = pgTable('shortUrl', {
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 's' }))
    .notNull()
    .primaryKey(),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  }).defaultNow(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  code: text('code').notNull().unique(),
  redirectUrl: text('redirectUrl').notNull(),
  userId: varchar('userId')
    .references(() => Users.id, {
      onDelete: 'cascade',
    })
    .notNull(),
});

export const AuthCodes = pgTable('authCodes', {
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'ac' }))
    .notNull()
    .primaryKey(),
  expiresAt: timestamp('expiresAt', {
    mode: 'date',
    withTimezone: true,
  })
    .$defaultFn(() => new Date(Date.now() + 1000 * 60 * 30)) // 30 minutes
    .notNull(),
  sessionId: text('sessionId').notNull(),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  usedAt: timestamp('usedAt', {
    mode: 'date',
    withTimezone: true,
  }),
  userId: varchar('userId')
    .references(() => Users.id, {
      onDelete: 'cascade',
    })
    .notNull()
    .default(sql`auth.jwt()->>'sub'`),
  orgId: varchar('orgId')
    .references(() => Orgs.id, {
      onDelete: 'cascade',
    })
    .notNull()
    .default(sql`auth.jwt()->>'org_id'`),
});

export type AuthCodeType = typeof AuthCodes.$inferSelect;

export const AuthCodesRelations = relations(AuthCodes, ({ one }) => ({
  user: one(Users, {
    fields: [AuthCodes.userId],
    references: [Users.id],
  }),
  org: one(Orgs, {
    fields: [AuthCodes.orgId],
    references: [Orgs.id],
  }),
}));
