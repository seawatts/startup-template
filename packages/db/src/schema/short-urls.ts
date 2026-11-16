import { createId } from '@seawatts/id';
import { boolean, index, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';

import { schema } from './common';
import { Orgs } from './organizations';
import { Users } from './users';

// ============================================================================
// SHORT URLS TABLE
// ============================================================================

export const ShortUrls = schema.table(
  'shortUrls',
  {
    // The public part of the link (`/s/<code>`), unique across every
    // organization because the redirect looks it up before it knows the tenant.
    code: varchar('code', { length: 128 }).notNull().unique(),
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
  },
  // The Links page lists an organization's newest links first.
  (table) => [
    index('shortUrls_organizationId_createdAt_idx').on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);

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
