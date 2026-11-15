import path from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { schemaName } from './roles';

/**
 * Applies every pending migration, connected as the given URL's role, or as
 * `role` when the URL is an admin's (a test that has no role passwords).
 */
export async function migrateDatabase(url: string, role?: string) {
  const sql = postgres(url, {
    connection: role ? { role } : {},
    max: 1,
    onnotice: () => undefined,
  });
  try {
    await migrate(drizzle(sql), {
      migrationsFolder: path.join(import.meta.dir, '../drizzle'),
      migrationsSchema: schemaName,
      migrationsTable: '__drizzle_migrations',
    });
  } finally {
    await sql.end();
  }
}
