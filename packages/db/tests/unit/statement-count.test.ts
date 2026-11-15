import { afterAll, describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import {
  countingStatements,
  countStatements,
  isWrapperStatement,
  serverTiming,
} from '../../src/statement-count';

// A request's database work is counted where statements leave: the queries
// the code wrote, the statements that only frame a transaction, and the
// transactions.
describe('isWrapperStatement', () => {
  it('knows framing and settings from queries', () => {
    for (const statement of [
      'begin',
      'COMMIT',
      'rollback to savepoint s1',
      'savepoint s1',
      "set local statement_timeout = '30s'",
      'select set_config($1, $2, true), set_config($3, $4, true)',
    ])
      expect(isWrapperStatement(statement)).toBe(true);
    for (const statement of [
      'select "id" from "app"."users"',
      'insert into x values (1)',
      'select settings from x',
    ])
      expect(isWrapperStatement(statement)).toBe(false);
  });

  it('writes the Server-Timing header', () => {
    expect(
      serverTiming(12.34, { content: 3, transactions: 1, wrapper: 3 }),
    ).toBe(
      'server;dur=12.3, db-content;desc="3", db-wrapper;desc="3", db-transactions;desc="1"',
    );
  });
});

// The driver calls a transaction's function once it holds a connection and
// `begin` has answered; the time until then is what the transaction waited.
describe('waited', () => {
  const pause = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  const pool = (waits: number[]) =>
    countStatements({
      begin: async (fn: (tx: unknown) => unknown) => {
        await pause(waits.shift() ?? 0);
        return fn({ unsafe: () => undefined });
      },
      unsafe: () => undefined,
    });

  it("keeps the longest wait of a call's transactions", async () => {
    const sql = pool([40, 5]);
    const { counts } = await countingStatements(() =>
      Promise.all([sql.begin(() => 1), sql.begin(() => 2)]),
    );
    expect(counts.transactions).toBe(2);
    expect(counts.waited).toBeGreaterThanOrEqual(35);
    expect(counts.waited).toBeLessThan(200);
  });

  it('is absent when the call opened no transaction', async () => {
    const { counts } = await countingStatements(async () => undefined);
    expect(counts.waited).toBeUndefined();
  });
});

// Needs a real PostgreSQL: set TEST_POSTGRES_URL to a disposable database.
const url = process.env.TEST_POSTGRES_URL;

describe.skipIf(!url)('countingStatements', () => {
  if (url) process.env.POSTGRES_URL = url;
  // A counted connection of its own, so another test file closing the shared
  // one does not matter here. Loaded by the first test that runs: this body
  // runs even when the tests are skipped.
  const load = () =>
    Promise.all([
      import('../../src/client'),
      import('drizzle-orm/postgres-js'),
    ]).then(([{ connectDatabase }, { drizzle }]) => {
      const connection = countStatements(connectDatabase(url ?? ''));
      return { connection, db: drizzle(connection) };
    });
  let loading: ReturnType<typeof load> | undefined;
  const loaded = () => {
    loading ??= load();
    return loading;
  };
  afterAll(async () => {
    if (loading) await (await loading).connection.end();
  });

  it('counts reads outside a transaction as content', async () => {
    const { db } = await loaded();
    const { counts } = await countingStatements(async () => {
      await db.execute(sql`select 1`);
      await db.execute(sql`select 2`);
    });
    expect(counts).toEqual({ content: 2, transactions: 0, wrapper: 0 });
  });

  it('splits a transaction into its reads and its frame', async () => {
    const { db } = await loaded();
    const { counts } = await countingStatements(() =>
      db.transaction(async (tx) => {
        await Promise.all([
          tx.execute(sql`select set_config('app.org_id', 'org_1', true)`),
          tx.execute(sql`select 1`),
          tx.execute(sql`select 2`),
        ]);
      }),
    );
    // begin + commit + the setting; two reads.
    expect(counts).toEqual({
      content: 2,
      transactions: 1,
      // A real transaction waited for its connection and `begin`.
      waited: expect.any(Number),
      wrapper: 3,
    });
  });

  it('counts each request on its own, and nothing outside one', async () => {
    const { db } = await loaded();
    await db.execute(sql`select 0`);
    const [one, three] = await Promise.all([
      countingStatements(() => db.execute(sql`select 1`)),
      countingStatements(() =>
        Promise.all([1, 2, 3].map((n) => db.execute(sql`select ${n}`))),
      ),
    ]);
    expect(one.counts.content).toBe(1);
    expect(three.counts.content).toBe(3);
  });
});
