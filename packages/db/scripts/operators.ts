import { userInfo } from 'node:os';
import { eq } from 'drizzle-orm';
import { authConnection, authDb } from '../src/auth-client';
import { Operators } from '../src/schema/operators';
import { Users } from '../src/schema/users';

// Who may open the operator console (Internal).
//
//   bun operators list
//   bun operators add person@example.com
//   bun operators remove person@example.com
//
// Runs against the database in POSTGRES_AUTH_URL (the auth role). For a hosted database wrap it:
// `bun with-env bun operators add person@example.com`. The person signs up
// first; the console also requires their email to be verified.

const [command = 'list', email] = process.argv.slice(2);

async function person(address: string | undefined) {
  if (!address) throw new Error('Give the email of someone who has signed up.');
  const [user] = await authDb
    .select({ email: Users.email, id: Users.id })
    .from(Users)
    .where(eq(Users.email, address.trim().toLowerCase()))
    .limit(1);
  if (!user) throw new Error(`Nobody has signed up as ${address}.`);
  return user;
}

async function run() {
  if (command === 'add') {
    const user = await person(email);
    await authDb
      .insert(Operators)
      .values({
        addedBy: process.env.USER || userInfo().username,
        userId: user.id,
      })
      .onConflictDoNothing();
    console.log(`${user.email} is an operator.`);
  } else if (command === 'remove') {
    const user = await person(email);
    await authDb.delete(Operators).where(eq(Operators.userId, user.id));
    console.log(`${user.email} is no longer an operator.`);
  } else if (command === 'list') {
    const rows = await authDb
      .select({
        addedBy: Operators.addedBy,
        createdAt: Operators.createdAt,
        email: Users.email,
      })
      .from(Operators)
      .innerJoin(Users, eq(Users.id, Operators.userId))
      .orderBy(Operators.createdAt);
    if (!rows.length) console.log('No operators yet.');
    for (const row of rows)
      console.log(
        `${row.email}  added ${row.createdAt.toISOString().slice(0, 10)}${row.addedBy ? ` by ${row.addedBy}` : ''}`,
      );
  } else throw new Error(`Unknown command "${command}": list, add or remove.`);
}

run()
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => authConnection.end());
