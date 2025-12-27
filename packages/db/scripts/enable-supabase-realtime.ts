import { sql } from 'drizzle-orm';
import { db } from '../src/client';

const tablesToEnableRealtime = [
  // Add tables here as they are created in the schema
] as const;

// RLS policies for realtime authorization
// Note: Removed obsolete policies that referenced non-existent tables (events, webhooks, requests)
// These tables were removed in the new schema. Add new policies here as needed for realtime tables.
const realtimePolicies: Array<{
  condition: string;
  name: string;
  operation: string;
  table: string;
  target: string;
}> = [];

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'startup_template'
      AND table_name = ${tableName}
    ) as exists;
  `);
  const rows = Array.isArray(result) ? result : [];
  return rows[0]?.exists ?? false;
}

async function isTableInPublication(tableName: string): Promise<boolean> {
  const result = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
      AND schemaname = 'startup_template'
      AND tablename = ${tableName}
    ) as exists;
  `);
  const rows = Array.isArray(result) ? result : [];
  return rows[0]?.exists ?? false;
}

async function enableRealtimeForTable(tableName: string) {
  console.log(`Checking realtime status for table: ${tableName}`);

  const exists = await tableExists(tableName);
  if (!exists) {
    console.log(
      `Skipping realtime for table: ${tableName} (table does not exist)`,
    );
    return;
  }

  const isAlreadyEnabled = await isTableInPublication(tableName);
  if (isAlreadyEnabled) {
    console.log(`Table ${tableName} is already enabled for realtime`);
    return;
  }

  console.log(`Enabling realtime for table: ${tableName}`);
  await db.execute(sql`
    ALTER PUBLICATION supabase_realtime ADD TABLE "startup_template"."${sql.raw(tableName)}";
  `);
  console.log(`Realtime enabled for table: ${tableName}`);
}

async function isPolicyExists(policyName: string): Promise<boolean> {
  const result = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE policyname = ${policyName}
      AND schemaname = 'realtime'
      AND tablename = 'messages'
    ) as exists;
  `);
  return Array.isArray(result)
    ? (result[0]?.exists ?? false)
    : (result.rows[0]?.exists ?? false);
}

async function createRealtimePolicy(policy: (typeof realtimePolicies)[0]) {
  console.log(`Checking policy: ${policy.name}`);

  const policyExists = await isPolicyExists(policy.name);
  if (policyExists) {
    console.log(`Policy ${policy.name} already exists`);
    return;
  }

  console.log(`Creating policy: ${policy.name}`);

  // Build the policy SQL manually to avoid Drizzle parameter issues
  const operationClause =
    policy.operation === 'select' ? 'USING' : 'WITH CHECK';
  const policySql = `
    CREATE POLICY "${policy.name}"
    ON ${policy.table}
    FOR ${policy.operation}
    TO ${policy.target}
    ${operationClause} (${policy.condition});
  `;

  await db.execute(sql.raw(policySql));
  console.log(`Policy ${policy.name} created successfully`);
}

async function _setupRealtimePolicies() {
  console.log('Setting up realtime authorization policies...');

  try {
    // Enable RLS on realtime.messages table if not already enabled
    await db.execute(sql`
      ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
    `);
    console.log('RLS enabled on realtime.messages table');

    // Create all policies
    for (const policy of realtimePolicies) {
      await createRealtimePolicy(policy);
    }

    console.log(
      'All realtime authorization policies have been set up successfully',
    );
  } catch (error) {
    console.error('Error setting up realtime policies:', error);
    throw error;
  }
}

async function _disablePublicRealtimeAccess() {
  console.log('Disabling public access to realtime...');

  try {
    // This would typically be done in Supabase dashboard, but we can document it here
    // The setting "Allow public access" should be disabled in Realtime Settings
    console.log(
      'IMPORTANT: Please disable "Allow public access" in Supabase Realtime Settings',
    );
    console.log(
      'This ensures only authenticated users with proper RLS policies can access realtime',
    );
  } catch (error) {
    console.error('Error configuring public access:', error);
    throw error;
  }
}

async function setupAllRealtime() {
  try {
    // Process tables sequentially to avoid deadlocks
    for (const table of tablesToEnableRealtime) {
      await enableRealtimeForTable(table);
    }
    console.log('All realtime subscriptions have been set up successfully');

    // Set up authorization policies
    // await setupRealtimePolicies();

    // Disable public access
    // await disablePublicRealtimeAccess();
  } catch (error) {
    console.error('Error setting up realtime subscriptions:', error);
    throw error;
  }
}

setupAllRealtime()
  .then(() => {
    console.log('Realtime setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Realtime setup failed:', error);
    process.exit(1);
  });
