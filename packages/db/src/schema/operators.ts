import { text, timestamp, varchar } from 'drizzle-orm/pg-core';

import { schema } from './common';
import { Users } from './users';

// The people who run the product: a row here lets a signed-in person open
// the operator console (Internal) and marks their organizations as ours, not
// a customer's. Rows are added and removed with `bun operators`
// (packages/db/scripts/operators.ts), never through the app or an
// environment variable, so who has access is data with a date and a name on
// it.
export const Operators = schema.table('operators', {
  /** Who added them: an operator's email, or the shell user of the script. */
  addedBy: text('addedBy'),
  createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
  userId: varchar('userId', { length: 128 })
    .notNull()
    .primaryKey()
    .references(() => Users.id, { onDelete: 'cascade' }),
});
