import { afterAll, describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import {
  guardWritesInReads,
  notReading,
  readingOnly,
  WriteInReadError,
  writesData,
} from '../../src/read-only';

// A read never writes. Inside `readingOnly` a statement that would write is
// refused before it reaches the database; reads, locks and everything
// outside a read go through.
describe('writesData', () => {
  it('knows a write from a read', () => {
    for (const statement of [
      'insert into "app"."apiKeys" ("id") values ($1)',
      '  update app.users set name = $1',
      'delete from app.users',
      '/* note */ insert into x values (1)',
      '-- note\nupdate x set y = 1',
      'with moved as (delete from x returning *) select * from moved',
      'with picked as (select id from x) update x set y = 1 from picked',
      'truncate app.users',
    ])
      expect(writesData(statement)).toBe(true);
    for (const statement of [
      'select "id" from "app"."users" where "name" = $1',
      'select * from x for share',
      "select set_config('app.org_id', $1, true)",
      'with picked as (select id from x) select * from picked',
      'select pg_advisory_xact_lock(1)',
      "select 'insert into x' as text",
      'select "updatedAt", "deleted" from x',
    ])
      expect(writesData(statement)).toBe(false);
  });
});

// Needs a real PostgreSQL: set TEST_POSTGRES_URL to a disposable database.
const url = process.env.TEST_POSTGRES_URL;

describe.skipIf(!url)('readingOnly', () => {
  process.env.POSTGRES_URL = url;
  // A guarded connection of its own, built the way client.ts builds the
  // shared one, so another test file closing that one does not matter here.
  const loaded = Promise.all([
    import('../../src/client'),
    import('drizzle-orm/postgres-js'),
  ]).then(([{ connectDatabase }, { drizzle }]) => {
    const connection = guardWritesInReads(connectDatabase(url ?? ''));
    return { connection, db: drizzle(connection) };
  });
  afterAll(async () => {
    const { connection } = await loaded;
    await connection.end();
  });
  // drizzle wraps what the driver threw.
  const cause = (caught: unknown) => (caught as { cause?: unknown }).cause;
  // The table doesn't exist: reaching the database would fail differently.
  const write = sql`insert into no_such_table values (1)`;

  it('refuses a write before it is sent, in and out of a transaction', async () => {
    const { db } = await loaded;
    const direct = await readingOnly('test.read', () =>
      db.execute(write).then(
        () => null,
        (caught) => cause(caught),
      ),
    );
    expect(direct).toBeInstanceOf(WriteInReadError);
    expect((direct as WriteInReadError).read).toBe('test.read');
    const inside = await readingOnly('test.read', () =>
      db
        .transaction((tx) => tx.execute(write))
        .then(
          () => null,
          (caught) => cause(caught),
        ),
    );
    expect(inside).toBeInstanceOf(WriteInReadError);
  });

  it('lets reads, locks and work outside a read through', async () => {
    const { db } = await loaded;
    const rows = await readingOnly('test.read', () =>
      db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(7)`);
        return tx.execute(sql`select 1 as one`);
      }),
    );
    expect(rows[0]).toEqual({ one: 1 });
    const outside = await readingOnly('test.read', () =>
      notReading(() =>
        db.execute(write).then(
          () => null,
          (caught) => cause(caught),
        ),
      ),
    );
    expect(outside).not.toBeNull();
    expect(outside).not.toBeInstanceOf(WriteInReadError);
  });
});
