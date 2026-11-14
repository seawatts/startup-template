type Environment = Record<string, string | undefined>;

const loopback = ['localhost', '127.0.0.1', '[::1]'];

/** TLS off for a loopback database, verified TLS everywhere else. */
export function databaseTls(url: string, env: Environment = process.env) {
  if (loopback.includes(new URL(url).hostname)) return false;
  return {
    ...(env.DATABASE_CA_CERT ? { ca: env.DATABASE_CA_CERT } : {}),
    rejectUnauthorized: true,
  } as const;
}

// Connections per server. A serverless host runs many requests on one
// server at once, and a transaction pooler shares a fixed set of real
// Postgres connections among every client, so this bounds our share of the
// pooler's client limit, not the database's. DATABASE_POOL_MAX overrides it.
export const defaultPoolMax = 10;
export function poolMax(value = process.env.DATABASE_POOL_MAX) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 50
    ? parsed
    : defaultPoolMax;
}

// Opening a pooler connection (TLS, then the role's password check) costs a
// few hundred milliseconds. Pooler client connections hold no Postgres
// backend, so on a serverless host keeping them a few minutes costs nothing
// and saves that reconnect on most clicks. Scripts and tests keep the short
// limit, so a one-off command that never closes its pool still exits
// promptly.
export function idleTimeout(env: Environment = process.env) {
  return env.VERCEL === '1' ? 240 : 20;
}
