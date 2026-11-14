import { OrgMembers } from '@seawatts/db/schema/organizations';
import { Users } from '@seawatts/db/schema/users';
import { type SQL, sql } from 'drizzle-orm';
import { operatorEmails } from './access';

// Our own accounts are not customers. Every figure and list in the console
// leaves them out unless "Include internal" is on, so a total means
// customers. An organization is internal when one of its members is an
// operator; a person is internal when they are one.

function emailList() {
  const emails = operatorEmails();
  return emails.length
    ? sql.join(
        emails.map((email) => sql`${email}`),
        sql`, `,
      )
    : null;
}

/** True for a person row (`Users`) that is one of ours. */
export function internalPerson(): SQL<boolean> {
  const emails = emailList();
  return emails
    ? sql<boolean>`lower(${Users.email}) in (${emails})`
    : sql<boolean>`false`;
}

/** True for an organization id column whose members include one of ours. */
export function internalOrganization(organizationId: SQL) {
  const emails = emailList();
  return emails
    ? sql<boolean>`exists (
        select 1 from ${OrgMembers} m
        join ${Users} u on u."id" = m."userId"
        where m."organizationId" = ${organizationId}
          and lower(u."email") in (${emails}))`
    : sql<boolean>`false`;
}
