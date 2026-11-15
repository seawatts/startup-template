import { afterAll, describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import {
  guardWritesInReads,
  LockInReadError,
  notReading,
  readingOnly,
  takesAdvisoryLock,
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

describe('takesAdvisoryLock', () => {
  it('knows a lock that waits from one that does not', () => {
    for (const statement of [
      'select pg_advisory_xact_lock(1)',
      'select pg_advisory_lock($1, $2)',
      'select pg_advisory_xact_lock_shared (hashtext($1))',
      'with fence as (select pg_advisory_lock_shared(1)) select * from x',
    ])
      expect(takesAdvisoryLock(statement)).toBe(true);
    for (const statement of [
      'select pg_try_advisory_xact_lock(1)',
      'select * from x for share',
      '-- pg_advisory_lock(1)\nselect 1',
      'select pg_advisory_unlock(1)',
    ])
      expect(takesAdvisoryLock(statement)).toBe(false);
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

  it('refuses an advisory lock inside a read and allows it in a save', async () => {
    const { db } = await loaded;
    const fence = sql`select pg_advisory_xact_lock(7)`;
    const refused = await readingOnly('test.read', () =>
      db
        .transaction((tx) => tx.execute(fence))
        .then(
          () => null,
          (caught) => cause(caught),
        ),
    );
    expect(refused).toBeInstanceOf(LockInReadError);
    expect((refused as LockInReadError).code).toBe('LOCK_IN_READ');
    await db.transaction((tx) => tx.execute(fence));
  });

  it('lets reads, row locks, try-locks and work outside a read through', async () => {
    const { db } = await loaded;
    const rows = await readingOnly('test.read', () =>
      db.transaction(async (tx) => {
        await tx.execute(sql`select pg_try_advisory_xact_lock(7)`);
        await tx.execute(
          sql`select 1 from pg_class where relname = 'pg_class' for share`,
        );
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
