import { faker } from '@faker-js/faker';
import * as schema from '@seawatts/db/schema';
import { createId } from '@seawatts/id';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export class TestFactories {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  async createUser(
    overrides?: Partial<schema.UserType>,
  ): Promise<schema.UserType> {
    const user = {
      avatarUrl: faker.image.avatar(),
      clerkId: `clerk_${faker.string.alphanumeric(20)}`,
      createdAt: new Date(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      id: createId({ prefix: 'user' }),
      lastName: faker.person.lastName(),
      online: false,
      ...overrides,
    };

    const [created] = await this.db
      .insert(schema.Users)
      .values(user)
      .returning();
    if (!created) {
      throw new Error('Failed to create user');
    }
    return created;
  }

  async createOrg(
    overrides?: Partial<schema.OrgType>,
  ): Promise<schema.OrgType> {
    const user = await this.createUser();

    const org = {
      clerkOrgId: `org_${faker.string.alphanumeric(20)}`,
      createdAt: new Date(),
      createdByUserId: user.id,
      id: createId({ prefix: 'org' }),
      name: faker.company.name(),
      stripeCustomerId: faker.string.alphanumeric(20),
      stripeSubscriptionId: faker.string.alphanumeric(20),
      stripeSubscriptionStatus: 'active' as const,
      ...overrides,
    };

    const [created] = await this.db.insert(schema.Orgs).values(org).returning();
    if (!created) {
      throw new Error('Failed to create org');
    }
    return created;
  }

  async createOrgMember(
    userId: string,
    orgId: string,
    role: 'user' | 'admin' | 'superAdmin' = 'user',
  ): Promise<schema.OrgMembersType> {
    const member = {
      createdAt: new Date(),
      id: createId({ prefix: 'member' }),
      orgId,
      role,
      userId,
    };

    const [created] = await this.db
      .insert(schema.OrgMembers)
      .values(member)
      .returning();
    if (!created) {
      throw new Error('Failed to create org member');
    }
    return created;
  }

  async createApiKey(
    userId: string,
    orgId: string,
    overrides?: Partial<schema.ApiKeyType>,
  ): Promise<schema.ApiKeyType> {
    const apiKey = {
      createdAt: new Date(),
      id: createId({ prefix: 'ak' }),
      isActive: true,
      key: faker.string.alphanumeric(64),
      name: faker.lorem.words(2),
      orgId,
      userId,
      ...overrides,
    };

    const [created] = await this.db
      .insert(schema.ApiKeys)
      .values(apiKey)
      .returning();
    if (!created) {
      throw new Error('Failed to create API key');
    }
    return created;
  }

  async createCompleteSetup(overrides?: {
    user?: Partial<schema.UserType>;
    org?: Partial<schema.OrgType>;
  }) {
    // Create user
    const user = await this.createUser(overrides?.user);

    // Create org
    const org = await this.createOrg({
      createdByUserId: user.id,
      ...overrides?.org,
    });

    // Add user as org member
    await this.createOrgMember(user.id, org.id, 'admin');

    return { org, user };
  }
}
