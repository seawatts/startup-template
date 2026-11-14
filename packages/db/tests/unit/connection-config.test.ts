import { describe, expect, it } from 'bun:test';
import {
  databaseTls,
  defaultPoolMax,
  idleTimeout,
  poolMax,
} from '../../src/connection-config';

describe('connection config', () => {
  it('turns TLS off only for a loopback database', () => {
    expect(databaseTls('postgres://u:p@127.0.0.1:5432/db', {})).toBe(false);
    expect(databaseTls('postgres://u:p@localhost/db', {})).toBe(false);
    expect(databaseTls('postgres://u:p@db.example.com:6543/db', {})).toEqual({
      rejectUnauthorized: true,
    });
    expect(
      databaseTls('postgres://u:p@db.example.com/db', {
        DATABASE_CA_CERT: 'cert',
      }),
    ).toEqual({ ca: 'cert', rejectUnauthorized: true });
  });

  it('bounds the pool size', () => {
    expect(poolMax(undefined)).toBe(defaultPoolMax);
    expect(poolMax('4')).toBe(4);
    expect(poolMax('0')).toBe(defaultPoolMax);
    expect(poolMax('500')).toBe(defaultPoolMax);
    expect(poolMax('many')).toBe(defaultPoolMax);
  });

  it('keeps connections longer on a serverless host', () => {
    expect(idleTimeout({ VERCEL: '1' })).toBe(240);
    expect(idleTimeout({})).toBe(20);
  });
});
