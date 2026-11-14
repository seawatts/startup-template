import { faker } from '@faker-js/faker';
import { ApiKeys, type ApiKeyType } from '@seawatts/db/schema/api-keys';
import {
  OrgMembers,
  type OrgMembersType,
  Orgs,
  type OrgType,
} from '@seawatts/db/schema/organizations';
import { Users, type UserType } from '@seawatts/db/schema/users';
import { createId } from '@seawatts/id';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export class TestFactories {
  constructor(private db: PostgresJsDatabase) {}

  async createUser(overrides?: Partial<UserType>): Promise<UserType> {
    const user = {
      createdAt: new Date(),
      email: faker.internet.email(),
      emailVerified: false,
      id: createId({ prefix: 'user' }),
      image: faker.image.avatar(),
      name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      ...overrides,
    };

    const [created] = await this.db.insert(Users).values(user).returning();
    if (!created) {
      throw new Error('Failed to create user');
    }
    return created;
  }

  async createOrg(overrides?: Partial<OrgType>): Promise<OrgType> {
    const org = {
      createdAt: new Date(),
      id: createId({ prefix: 'org' }),
      name: faker.company.name(),
      slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
      stripeCustomerId: faker.string.alphanumeric(20),
      stripeSubscriptionId: faker.string.alphanumeric(20),
      stripeSubscriptionStatus: 'active' as const,
      ...overrides,
    };

    const [created] = await this.db.insert(Orgs).values(org).returning();
    if (!created) {
      throw new Error('Failed to create org');
    }
    return created;
  }

  async createOrgMember(
    userId: string,
    organizationId: string,
    role: 'member' | 'admin' | 'owner' = 'member',
  ): Promise<OrgMembersType> {
    const member = {
      createdAt: new Date(),
      id: createId({ prefix: 'member' }),
      organizationId,
      role,
      userId,
    };

    const [created] = await this.db
      .insert(OrgMembers)
      .values(member)
      .returning();
    if (!created) {
      throw new Error('Failed to create org member');
    }
    return created;
  }

  async createApiKey(
    userId: string,
    organizationId: string,
    overrides?: Partial<ApiKeyType>,
  ): Promise<ApiKeyType> {
    const apiKey = {
      createdAt: new Date(),
      id: createId({ prefix: 'ak' }),
      isActive: true,
      key: faker.string.alphanumeric(64),
      name: faker.lorem.words(2),
      organizationId,
      userId,
      ...overrides,
    };

    const [created] = await this.db.insert(ApiKeys).values(apiKey).returning();
    if (!created) {
      throw new Error('Failed to create API key');
    }
    return created;
  }

  async createCompleteSetup(overrides?: {
    user?: Partial<UserType>;
    org?: Partial<OrgType>;
  }) {
    // Create user
    const user = await this.createUser(overrides?.user);

    // Create org
    const org = await this.createOrg(overrides?.org);

    // Add user as org member with admin role
    await this.createOrgMember(user.id, org.id, 'admin');

    return { org, user };
  }
}
