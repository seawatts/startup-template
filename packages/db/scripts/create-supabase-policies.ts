import { sql } from 'drizzle-orm';
import { db } from '../src/client';

type PolicyOperation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';

interface Policy {
  name: string;
  operation: PolicyOperation;
  using?: string;
  withCheck?: string;
}

interface PolicyConfig {
  tableName: string;
  policies: Policy[];
}

// Create the requesting_user_id function as per Clerk docs
const createRequestingUserIdFunction = async () => {
  console.log('Creating requesting_user_id function...');
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION requesting_user_id()
    RETURNS text
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = ''
    AS $$
      SELECT NULLIF(
        current_setting('request.jwt.claims', true)::json->>'sub',
        ''
      )::text;
    $$;
  `);
  console.log('requesting_user_id function created successfully');
};

// Create the requesting_org_id function for consistency
// Note: Better Auth organization plugin uses 'organization_id' as the JWT claim name
// This matches the schema which uses 'organizationId' columns
const createRequestingOrgIdFunction = async () => {
  console.log('Creating requesting_org_id function...');
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION requesting_org_id()
    RETURNS text
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = ''
    AS $$
      SELECT NULLIF(
        current_setting('request.jwt.claims', true)::json->>'organization_id',
        ''
      )::text;
    $$;
  `);
  console.log('requesting_org_id function created successfully');
};

// Common policy conditions using the requesting_user_id function
const policyConditions = {
  orgOwnership: (columnName = 'organizationId') =>
    `(SELECT requesting_org_id()) = ("${columnName}")::text`,
  userOwnership: (columnName = 'userId') =>
    `(SELECT requesting_user_id()) = ("${columnName}")::text`,
} as const;

// Helper to create a policy for user ownership
const createUserOwnershipPolicy = (
  operation: PolicyOperation,
  columnName: string,
): Policy => ({
  name: `User can ${operation.toLowerCase()} their own records`,
  operation,
  using:
    operation === 'INSERT'
      ? undefined
      : policyConditions.userOwnership(columnName),
  withCheck:
    operation === 'INSERT'
      ? policyConditions.userOwnership(columnName)
      : undefined,
});

// Helper to create a policy for org ownership
const createOrgOwnershipPolicy = (
  operation: PolicyOperation,
  columnName: string,
): Policy => ({
  name: `Users can ${operation.toLowerCase()} their organization's records`,
  operation,
  using: policyConditions.orgOwnership(columnName),
});

const createPolicy = async (tableName: string, policy: Policy) => {
  const { name, operation, using, withCheck } = policy;

  // First drop the policy if it exists
  await db.execute(sql`
    DROP POLICY IF EXISTS ${sql.raw(`"${name}"`)} ON "startup_template"."${sql.raw(tableName)}";
  `);

  // Then create the new policy
  const policySql = sql`
    CREATE POLICY ${sql.raw(`"${name}"`)}
    ON "startup_template"."${sql.raw(tableName)}"
    ${operation === 'ALL' ? sql`FOR ALL` : sql`FOR ${sql.raw(operation)}`}
    TO authenticated
    ${using ? sql`USING (${sql.raw(using)})` : sql``}
    ${withCheck ? sql`WITH CHECK (${sql.raw(withCheck)})` : sql``}
  `;

  await db.execute(policySql);
};

const dropPolicy = async (tableName: string, policyName: string) => {
  await db.execute(sql`
    DROP POLICY IF EXISTS ${sql.raw(`"${policyName}"`)} ON "startup_template"."${sql.raw(tableName)}";
  `);
};

const tableExists = async (tableName: string): Promise<boolean> => {
  const result = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'startup_template'
      AND table_name = ${tableName}
    ) as exists;
  `);
  const rows = Array.isArray(result) ? result : [];
  return rows[0]?.exists ?? false;
};

const enableRLS = async (tableName: string) => {
  const exists = await tableExists(tableName);
  if (!exists) {
    console.log(`Skipping RLS for table: ${tableName} (table does not exist)`);
    return;
  }
  console.log(`Enabling RLS for table: ${tableName}`);
  await db.execute(sql`
    ALTER TABLE "startup_template"."${sql.raw(tableName)}" ENABLE ROW LEVEL SECURITY;
  `);
  console.log(`RLS enabled for table: ${tableName}`);
};

const policyConfigs: Record<string, PolicyConfig> = {
  apiKeys: {
    policies: [
      createUserOwnershipPolicy('ALL', 'userId'),
      createOrgOwnershipPolicy('ALL', 'organizationId'),
    ],
    tableName: 'apiKeys',
  },
  apiKeyUsage: {
    policies: [
      createUserOwnershipPolicy('ALL', 'userId'),
      createOrgOwnershipPolicy('ALL', 'organizationId'),
    ],
    tableName: 'apiKeyUsage',
  },
  authCodes: {
    policies: [
      createUserOwnershipPolicy('ALL', 'userId'),
      createOrgOwnershipPolicy('ALL', 'organizationId'),
    ],
    tableName: 'authCodes',
  },
  member: {
    policies: [
      createUserOwnershipPolicy('ALL', 'userId'),
      createOrgOwnershipPolicy('ALL', 'organizationId'),
    ],
    tableName: 'member',
  },
  organization: {
    policies: [
      // Allow all authenticated users to select organizations
      {
        name: 'Users can select organizations',
        operation: 'SELECT',
        using: 'true',
      },
      // Allow all authenticated users to insert organizations
      {
        name: 'Users can insert organizations',
        operation: 'INSERT',
        withCheck: 'true',
      },
      // Allow all authenticated users to update organizations
      {
        name: 'Users can update organizations',
        operation: 'UPDATE',
        using: 'true',
        withCheck: 'true',
      },
    ],
    tableName: 'organization',
  },
  user: {
    policies: [
      createUserOwnershipPolicy('SELECT', 'id'),
      createUserOwnershipPolicy('UPDATE', 'id'),
    ],
    tableName: 'user',
  },
};

async function withErrorHandling<T>(
  operation: () => Promise<T>,
  successMessage: string,
  errorMessage: string,
): Promise<T> {
  try {
    const result = await operation();
    console.log(successMessage);
    return result;
  } catch (error) {
    console.error(errorMessage, error);
    throw error;
  }
}

async function setupTablePolicies(config: PolicyConfig) {
  return withErrorHandling(
    async () => {
      const exists = await tableExists(config.tableName);
      if (!exists) {
        console.log(
          `Skipping policies for table: ${config.tableName} (table does not exist)`,
        );
        return;
      }
      await enableRLS(config.tableName);
      await Promise.all(
        config.policies.map((policy) => createPolicy(config.tableName, policy)),
      );
    },
    `Policies for ${config.tableName} set up successfully`,
    `Error setting up policies for ${config.tableName}`,
  );
}

async function dropTablePolicies(config: PolicyConfig) {
  return withErrorHandling(
    async () => {
      await Promise.all(
        config.policies.map((policy) =>
          dropPolicy(config.tableName, policy.name),
        ),
      );
    },
    `Policies for ${config.tableName} dropped successfully`,
    `Error dropping policies for ${config.tableName}`,
  );
}

async function setupAllPolicies() {
  return withErrorHandling(
    async () => {
      // First create the requesting_user_id and requesting_org_id functions
      await createRequestingUserIdFunction();
      await createRequestingOrgIdFunction();

      // Process tables sequentially to avoid deadlocks
      for (const config of Object.values(policyConfigs)) {
        await setupTablePolicies(config);
      }
    },
    'All policies have been set up successfully',
    'Error setting up policies',
  );
}

async function _dropAllPolicies() {
  return withErrorHandling(
    async () => {
      await Promise.all(Object.values(policyConfigs).map(dropTablePolicies));
    },
    'All policies have been dropped successfully',
    'Error dropping policies',
  );
}

// _dropAllPolicies()
//   .then(() => {
//     console.log('Policy setup completed');
//     process.exit(0);
//   })
//   .catch((error) => {
//     console.error('Policy setup failed:', error);
//     process.exit(1);
//   });
setupAllPolicies()
  .then(() => {
    console.log('Policy setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Policy setup failed:', error);
    process.exit(1);
  });
