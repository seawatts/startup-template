'use server';

import { auth } from '@seawatts/auth/server';
import { db } from '@seawatts/db/client';
import { OrgMembers, Orgs } from '@seawatts/db/schema/organizations';
import { Users } from '@seawatts/db/schema/users';
import { isEntitled } from '@seawatts/stripe/guards/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSafeActionClient } from 'next-safe-action';
import { z } from 'zod';

// Create the action client
const action = createSafeActionClient();

// Validation schemas
const updateTeamNameSchema = z.object({
  name: z
    .string()
    .min(1, 'Team name is required')
    .max(100, 'Team name too long'),
});

const deleteTeamSchema = z.object({
  confirm: z
    .boolean()
    .refine((val) => val === true, 'You must confirm deletion'),
});

const updateMemberRoleSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  role: z.enum(['admin', 'member', 'owner']),
});

const removeMemberSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
});

const leaveOrganizationSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
});

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member']).default('member'),
});

// Helper function to get session
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// Invite member action with Stripe entitlements check
export const inviteMemberAction = action
  .inputSchema(inviteMemberSchema)
  .action(async ({ parsedInput }) => {
    const session = await getSession();

    if (!session?.user?.id || !session.session?.activeOrganizationId) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;
    const orgId = session.session.activeOrganizationId;

    // Get the organization
    const org = await db
      .select()
      .from(Orgs)
      .where(eq(Orgs.id, orgId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if user is admin/owner
    const currentMember = await db
      .select()
      .from(OrgMembers)
      .where(
        and(
          eq(OrgMembers.organizationId, org.id),
          eq(OrgMembers.userId, userId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (
      !currentMember ||
      (currentMember.role !== 'admin' && currentMember.role !== 'owner')
    ) {
      throw new Error('Only admins can invite members');
    }

    // Check Stripe entitlements for invite-org-members feature
    await isEntitled(
      'unlimited_developers',
      'Team member invitations require a paid plan. Please upgrade to invite team members.',
    );

    // Invite the user to the organization via Better Auth
    await auth.api.createInvitation({
      body: {
        email: parsedInput.email,
        organizationId: org.id,
        role: parsedInput.role,
      },
      headers: await headers(),
    });

    revalidatePath('/app/settings/organization');

    return { success: true };
  });

// Update team name action
export const updateTeamNameAction = action
  .inputSchema(updateTeamNameSchema)
  .action(async ({ parsedInput }) => {
    const session = await getSession();

    if (!session?.user?.id || !session.session?.activeOrganizationId) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;
    const orgId = session.session.activeOrganizationId;

    // Get the organization
    const org = await db
      .select()
      .from(Orgs)
      .where(eq(Orgs.id, orgId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if user is admin/owner
    const currentMember = await db
      .select()
      .from(OrgMembers)
      .where(
        and(
          eq(OrgMembers.organizationId, org.id),
          eq(OrgMembers.userId, userId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (
      !currentMember ||
      (currentMember.role !== 'admin' && currentMember.role !== 'owner')
    ) {
      throw new Error('Only admins can update team name');
    }

    // Update organization name via Better Auth
    await auth.api.updateOrganization({
      body: {
        data: {
          name: parsedInput.name,
        },
        organizationId: orgId,
      },
      headers: await headers(),
    });

    revalidatePath('/app/settings/organization');

    return { success: true };
  });

// Delete team action
export const deleteTeamAction = action
  .inputSchema(deleteTeamSchema)
  .action(async ({ parsedInput }) => {
    const session = await getSession();

    if (!session?.user?.id || !session.session?.activeOrganizationId) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;
    const orgId = session.session.activeOrganizationId;

    // Validate confirmation
    if (!parsedInput.confirm) {
      throw new Error('You must confirm deletion');
    }

    // Get the organization
    const org = await db
      .select()
      .from(Orgs)
      .where(eq(Orgs.id, orgId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if user is owner
    const currentMember = await db
      .select()
      .from(OrgMembers)
      .where(
        and(
          eq(OrgMembers.organizationId, org.id),
          eq(OrgMembers.userId, userId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!currentMember || currentMember.role !== 'owner') {
      throw new Error('Only the organization owner can delete the team');
    }

    // Delete organization via Better Auth
    await auth.api.deleteOrganization({
      body: {
        organizationId: orgId,
      },
      headers: await headers(),
    });

    // Redirect to dashboard after deletion
    redirect('/app/dashboard');
  });

// Get organization members action
export const getOrganizationMembersAction = action.action(async () => {
  const session = await getSession();

  if (!session?.user?.id || !session.session?.activeOrganizationId) {
    throw new Error('Unauthorized');
  }

  const orgId = session.session.activeOrganizationId;

  // Get the organization
  const org = await db
    .select()
    .from(Orgs)
    .where(eq(Orgs.id, orgId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!org) {
    throw new Error('Organization not found');
  }

  // Get organization members with user details
  // One query: only the columns the members list shows.
  const members = await db
    .select({
      createdAt: OrgMembers.createdAt,
      email: Users.email,
      id: OrgMembers.id,
      name: Users.name,
      role: OrgMembers.role,
      userId: OrgMembers.userId,
    })
    .from(OrgMembers)
    .leftJoin(Users, eq(Users.id, OrgMembers.userId))
    .where(eq(OrgMembers.organizationId, org.id));

  return members.map((m) => ({ ...m, email: m.email || 'Unknown' }));
});

// Remove member action
export const removeMemberAction = action
  .inputSchema(removeMemberSchema)
  .action(async ({ parsedInput }) => {
    const session = await getSession();

    if (!session?.user?.id || !session.session?.activeOrganizationId) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;
    const orgId = session.session.activeOrganizationId;

    // Get the organization
    const org = await db
      .select()
      .from(Orgs)
      .where(eq(Orgs.id, orgId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if user is admin/owner
    const currentMember = await db
      .select()
      .from(OrgMembers)
      .where(
        and(
          eq(OrgMembers.organizationId, org.id),
          eq(OrgMembers.userId, userId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (
      !currentMember ||
      (currentMember.role !== 'admin' && currentMember.role !== 'owner')
    ) {
      throw new Error('Only admins can remove members');
    }

    // Get the member to be removed
    const memberToRemove = await db
      .select()
      .from(OrgMembers)
      .where(eq(OrgMembers.id, parsedInput.memberId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!memberToRemove || memberToRemove.organizationId !== org.id) {
      throw new Error('Member not found');
    }

    // Prevent removing the owner
    if (memberToRemove.role === 'owner') {
      throw new Error('Cannot remove the organization owner');
    }

    // Remove member via Better Auth
    await auth.api.removeMember({
      body: {
        memberIdOrEmail: memberToRemove.userId,
        organizationId: org.id,
      },
      headers: await headers(),
    });

    revalidatePath('/app/settings/organization');

    return { success: true };
  });

// Update member role action
export const updateMemberRoleAction = action
  .inputSchema(updateMemberRoleSchema)
  .action(async ({ parsedInput }) => {
    const session = await getSession();

    if (!session?.user?.id || !session.session?.activeOrganizationId) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;
    const orgId = session.session.activeOrganizationId;

    // Get the organization
    const org = await db
      .select()
      .from(Orgs)
      .where(eq(Orgs.id, orgId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if user is admin/owner
    const currentMember = await db
      .select()
      .from(OrgMembers)
      .where(
        and(
          eq(OrgMembers.organizationId, org.id),
          eq(OrgMembers.userId, userId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (
      !currentMember ||
      (currentMember.role !== 'admin' && currentMember.role !== 'owner')
    ) {
      throw new Error('Only admins can update member roles');
    }

    // Get the member to be updated
    const memberToUpdate = await db
      .select()
      .from(OrgMembers)
      .where(eq(OrgMembers.id, parsedInput.memberId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!memberToUpdate || memberToUpdate.organizationId !== org.id) {
      throw new Error('Member not found');
    }

    // Prevent changing owner role unless you're the owner
    if (memberToUpdate.role === 'owner' && currentMember.role !== 'owner') {
      throw new Error('Only the owner can change owner role');
    }

    // Update member role via Better Auth
    await auth.api.updateMemberRole({
      body: {
        memberId: memberToUpdate.id,
        organizationId: org.id,
        role: parsedInput.role,
      },
      headers: await headers(),
    });

    revalidatePath('/app/settings/organization');

    return { success: true };
  });

// Leave organization action
export const leaveOrganizationAction = action
  .inputSchema(leaveOrganizationSchema)
  .action(async ({ parsedInput }) => {
    const session = await getSession();

    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;

    // Get the organization
    const org = await db
      .select()
      .from(Orgs)
      .where(eq(Orgs.id, parsedInput.organizationId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!org) {
      throw new Error('Organization not found');
    }

    // Get the user's membership
    const currentMember = await db
      .select()
      .from(OrgMembers)
      .where(
        and(
          eq(OrgMembers.organizationId, org.id),
          eq(OrgMembers.userId, userId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!currentMember) {
      throw new Error('You are not a member of this organization');
    }

    // Prevent the owner from leaving
    if (currentMember.role === 'owner') {
      throw new Error(
        'Cannot leave organization as the owner. Please transfer ownership or delete the organization.',
      );
    }

    // Remove self from organization via Better Auth
    await auth.api.removeMember({
      body: {
        memberIdOrEmail: userId,
        organizationId: org.id,
      },
      headers: await headers(),
    });

    revalidatePath('/app/settings/organization');

    return { success: true };
  });
