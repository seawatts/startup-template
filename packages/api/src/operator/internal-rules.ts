import { Operators } from '@seawatts/db/schema/operators';
import { OrgMembers } from '@seawatts/db/schema/organizations';
import { Users } from '@seawatts/db/schema/users';
import { type SQL, sql } from 'drizzle-orm';

// Our own accounts are not customers. Every figure and list in the console
// leaves them out unless "Include internal" is on, so a total means
// customers. An organization is internal when one of its members is an
// operator; a person is internal when they are one.

/** True for a person row (`Users`) that is one of ours. */
export function internalPerson(): SQL<boolean> {
  return sql<boolean>`exists (
    select 1 from ${Operators} o where o."userId" = ${Users}."id")`;
}

/** True for an organization id column whose members include one of ours. */
export function internalOrganization(organizationId: SQL) {
  return sql<boolean>`exists (
    select 1 from ${OrgMembers} m
    join ${Operators} o on o."userId" = m."userId"
    where m."organizationId" = ${organizationId})`;
}
