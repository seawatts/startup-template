'use server';
import { revalidatePath } from 'next/cache';
import { createSafeActionClient } from 'next-safe-action';
import { z } from 'zod';

const action = createSafeActionClient();

// Schema definitions
const createApiKeySchema = z.object({
  currentPath: z.string(),
  metadata: z.object({
    envId: z.string(),
    name: z.string(),
    projectId: z.string(),
    userId: z.string(),
  }),
  orgId: z.string(),
});

// Server actions
export const createApiKey = action
  .schema(createApiKeySchema)
  .action(async ({ parsedInput }) => {
    try {
      const { orgId: _orgId, metadata: _metadata } = parsedInput;
      // const response = await clerk.createApiKey({
      //   orgId,
      //   metadata,
      //   userId: metadata.userId,
      // });

      // await clerk.updateApiKey(response.apiKeyId, {
      //   metadata: JSON.stringify({
      //     ...metadata,
      //     name: metadata.name,
      //     last4ApiKeyToken: response.apiKeyToken.slice(-4),
      //   }),
      // });

      revalidatePath(parsedInput.currentPath);
      return { data: {}, success: true };
    } catch (error) {
      return { error: error, success: false };
    }
  });

export const createOrgAction = action
  .schema(
    z.object({
      currentPath: z.string().min(1, 'Current path is required'),
      domain: z.string().optional(),
      enableAutoJoiningByDomain: z.boolean().optional(),
      membersMustHaveMatchingDomain: z.boolean().optional(),
      name: z.string().min(2, 'Organization name is required'),
      userId: z.string().min(1, 'User ID is required'),
    }),
  )
  .action(async ({ parsedInput }) => {
    try {
      // createOrg automatically adds the current user to the org
      // const response = await clerk.createOrg({
      //   domain: parsedInput.domain,
      //   name: parsedInput.name,
      //   enableAutoJoiningByDomain:
      //     parsedInput.enableAutoJoiningByDomain ?? false,
      //   membersMustHaveMatchingDomain:
      //     parsedInput.membersMustHaveMatchingDomain ?? false,
      // });
      // await clerk.addUserToOrg({
      //   userId: parsedInput.userId,
      //   orgId: response.orgId,
      //   role: 'Admin',
      // });

      revalidatePath(parsedInput.currentPath);
      return { data: {}, success: true };
    } catch (error) {
      // Handle clerk validation errors
      if (error instanceof Error) {
        try {
          const errorObj = JSON.parse(error.message);
          // Handle any validation errors from clerk
          if (
            errorObj &&
            typeof errorObj === 'object' &&
            !Array.isArray(errorObj)
          ) {
            // Collect all validation errors
            const errors = Object.entries(errorObj as Record<string, unknown>)
              .filter(
                ([_, value]) =>
                  Array.isArray(value) &&
                  value.length > 0 &&
                  typeof value[0] === 'string',
              )
              .map(([_, value]) => (value as string[])[0]);

            if (errors.length > 0) {
              return {
                error: errors,
                success: false,
              };
            }
          }
        } catch {
          // If parsing fails, return the original error message as a single-item array
          return {
            error: [error.message],
            success: false,
          };
        }
      }
      return {
        error: ['Failed to create organization'],
        success: false,
      };
    }
  });
