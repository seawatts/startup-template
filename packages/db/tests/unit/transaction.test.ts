import { afterAll, describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { delayProxy } from '../utils/delay-proxy';

// Needs a real PostgreSQL: set TEST_POSTGRES_URL to a disposable database.
// The driver patch only shows against a server, so these also guard it.
const url = process.env.TEST_POSTGRES_URL;

const roundTrip = 60;

describe.skipIf(!url)('inTransaction', () => {
  process.env.POSTGRES_URL = url;
  const loaded = Promise.all([
    import('../../src/client'),
    import('../../src/transaction'),
  ]);
  afterAll(async () => {
    const [{ connection }] = await loaded;
    await connection.end();
  });

  it('applies its settings before the first read sent behind them', async () => {
    const [, { inTransaction }] = await loaded;
    const [row] = await inTransaction(
      (tx) =>
        tx.execute<{ org: string; limit: string }>(
          sql`select current_setting('app.org_id') as org, current_setting('statement_timeout') as limit`,
        ),
      { settings: { 'app.org_id': 'org_1' } },
    );
    expect(row).toEqual({ limit: '30s', org: 'org_1' });
  });

  it('keeps settings inside their transaction', async () => {
    const [{ db }, { inTransaction }] = await loaded;
    await inTransaction(async () => undefined, {
      settings: { 'app.org_id': 'org_1' },
    });
    const [row] = await db.execute<{ org: string | null }>(
      sql`select nullif(current_setting('app.org_id', true), '') as org`,
    );
    expect(row?.org).toBeNull();
  });

  it('runs reads issued together and gives each its own rows', async () => {
    const [, { inTransaction }] = await loaded;
    const numbers = Array.from({ length: 25 }, (_, index) => index);
    const rows = await inTransaction((tx) =>
      Promise.all(
        numbers.map((n) =>
          tx.execute<{ n: number; label: string }>(
            sql`select ${n}::int as n, ${`row ${n}`}::text as label`,
          ),
        ),
      ),
    );
    expect(rows.map(([row]) => row)).toEqual(
      numbers.map((n) => ({ label: `row ${n}`, n })),
    );
  });

  it('stops a statement that runs past the limit', async () => {
    const [, { inTransaction }] = await loaded;
    await expect(
      inTransaction((tx) => tx.execute(sql`select pg_sleep(2)`), {
        statementLimit: '200ms',
      }),
    ).rejects.toThrow();
  });

  it('leaves the pool usable after a failed transaction', async () => {
    const [{ db }, { inTransaction }] = await loaded;
    await expect(
      inTransaction(async (tx) => {
        await tx.execute(sql`select 1`);
        throw new Error('stop');
      }),
    ).rejects.toThrow('stop');
    const [row] = await db.execute<{ status: string }>(
      sql`select 'ok' as status`,
    );
    expect(row?.status).toBe('ok');
  });
});

describe.skipIf(!url)('the patched driver over a slow link', () => {
  it('sends reads issued together in a transaction without waiting between them', async () => {
    const proxy = await delayProxy(new URL(url as string), roundTrip / 2);
    const slow = postgres(proxy.url, {
      max: 1,
      max_pipeline: 1,
      prepare: false,
    });
    try {
      await slow`select 1`;
      const reads = 10;
      const started = performance.now();
      const rows = await slow.begin((tx) =>
        Promise.all(
          Array.from(
            { length: reads },
            (_, n) => tx`select ${n}::int as n, ${`row ${n}`}::text as label`,
          ),
        ),
      );
      const elapsed = performance.now() - started;
      expect(rows.map(([row]) => row?.n)).toEqual(
        Array.from({ length: reads }, (_, n) => n),
      );
      // BEGIN, the ten reads and COMMIT: three round trips when the reads
      // pipeline, twelve or more (two per read upstream) when they don't.
      expect(elapsed).toBeLessThan(roundTrip * 6);
    } finally {
      await slow.end({ timeout: 1 });
      proxy.close();
    }
  });

  it('does not pipeline outside a transaction, which a transaction pooler would drop', async () => {
    const proxy = await delayProxy(new URL(url as string), roundTrip / 2);
    const slow = postgres(proxy.url, {
      max: 1,
      max_pipeline: 1,
      prepare: false,
    });
    try {
      await slow`select 1`;
      const reads = 5;
      const started = performance.now();
      await Promise.all(
        Array.from({ length: reads }, (_, n) => slow`select ${n}::int as n`),
      );
      // One connection, one query on the wire at a time.
      expect(performance.now() - started).toBeGreaterThan(
        roundTrip * (reads - 1),
      );
    } finally {
      await slow.end({ timeout: 1 });
      proxy.close();
    }
  });
});
