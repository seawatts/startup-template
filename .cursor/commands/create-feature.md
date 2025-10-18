# Create New Feature

This command automates the complete workflow for creating a new feature in the application. It follows a systematic approach to ensure database schema, API endpoints, and frontend integration are all properly implemented.

## Usage

To use this command, type `/create-feature` followed by:
1. **Use case description**: What feature you want to add and why
2. **Relevant pages/components**: Where this feature should be implemented

**Example**:
```
/create-feature

Use Case: Allow users to create new journal entries with a title and content
Relevant Pages: /entries page, specifically the "Create New Entry" button
```

---

## Step-by-Step Process

### 1. Clarify Requirements
**Goal**: Ensure you have all necessary information before proceeding.

#### Evaluate if you have enough information:
Before starting research, check if the use case provides:
- ✅ **Clear feature description**: What functionality is being added?
- ✅ **User action**: What will users do with this feature?
- ✅ **Data requirements**: What information needs to be stored?
- ✅ **UI location**: Where should this feature appear?
- ✅ **User flow**: What happens when users interact with it?

#### If information is missing, ask clarifying questions:

**Data-related questions:**
- "What data fields need to be stored for this feature?"
- "What data types should each field be (text, number, date, boolean, etc.)?"
- "Are any fields required vs optional?"
- "Are there relationships to existing data (users, entries, etc.)?"

**UI/UX questions:**
- "What should happen when the user clicks [button/performs action]?"
- "Should this feature display existing data or only create new data?"
- "What should users see after completing the action (confirmation message, redirect, modal close, etc.)?"
- "Should this be accessible from multiple pages or just one specific page?"
- "Is this a modal/dialog, inline form, or separate page?"

**Validation & Business Logic questions:**
- "Are there any validation rules or constraints?"
- "What error messages should be shown for invalid input?"
- "Are there any permissions or access restrictions?"
- "Should there be any default values?"

**Integration questions:**
- "Does this feature need to update or interact with existing features?"
- "Should this trigger any notifications or side effects?"
- "Are there any API limitations or rate limits to consider?"

**Ask 2-4 specific questions** based on what's missing. Don't overwhelm the user with all questions at once.

#### ⚠️ DO NOT PROCEED until you have:
1. Clear understanding of the data model
2. Specific UI location(s) identified
3. User interaction flow defined
4. Any validation or business rules clarified

---

### 2. Research & Confirm UI Location
**Goal**: Identify the exact UI components that need to be modified before making any changes.

#### Actions:
1. **Search for relevant pages** mentioned by the user
2. **Locate specific UI elements** (buttons, forms, components)
3. **Analyze component structure** and existing patterns
4. **Identify hook/API usage** in those components

#### Present Findings:
Before proceeding, present the following to the user:
- **Files to be modified**: List all UI files that will be changed
- **Current implementation**: Show relevant code snippets
- **Proposed changes**: Describe what will be added/modified
- **Component hierarchy**: Show where new code will be added

#### ⚠️ WAIT FOR USER CONFIRMATION
**Do not proceed with any changes until the user confirms:**
- ✅ Correct files identified
- ✅ Correct UI components located
- ✅ Proposed approach is acceptable

---

### 3. Database Design
**Goal**: Determine what data needs to be stored and how it should be structured.

#### Information to Consider:
- What data fields are required?
- What data types are appropriate?
- Are there relationships to existing tables?
- What should be indexed for performance?
- What validation rules apply?

#### Implementation:
Create or update the database table in `packages/db/src/schema.ts` following these patterns:

```typescript
// Example pattern from existing tables:
export const YourTable = pgTable('your_table', {
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'prefix' }))
    .notNull()
    .primaryKey(),

  // Your fields here
  title: text('title').notNull(),
  content: text('content'),

  // Standard timestamps
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  }).defaultNow(),

  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),

  // User relationship
  userId: varchar('userId')
    .references(() => Users.id, {
      onDelete: 'cascade',
    })
    .notNull()
    .default(requestingUserId()),
});

// Type export
export type YourTableType = typeof YourTable.$inferSelect;

// Zod schemas for validation
export const CreateYourTableSchema = createInsertSchema(YourTable).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
  userId: true,
});

export const UpdateYourTableSchema = createUpdateSchema(YourTable).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
  userId: true,
});

// Relations (if needed)
export const YourTableRelations = relations(YourTable, ({ one }) => ({
  user: one(Users, {
    fields: [YourTable.userId],
    references: [Users.id],
  }),
}));
```

#### Update Seed Data:
Update `packages/db/src/seed.ts` to include initial data for your new table:

```typescript
// Add to imports
import { YourTable } from './schema';

// Add to delete statements (for reset)
await db.delete(YourTable);

// Add to seed configuration
await seed(db, {
  Users,
  YourTable, // Add your table
}).refine((funcs) => ({
  // ... existing config
  YourTable: {
    columns: {
      userId: funcs.default({ defaultValue: userId }),
      title: funcs.loremIpsum({ sentencesCount: 1 }),
      // ... your fields
    },
    count: 10, // Number of seed records
  },
}));
```

#### Run Migration:
```bash
cd packages/db && bun run gen-migration && bun run migrate
```

#### Seed Database:
Run the `/seed` command or:
```bash
cd packages/db && infisical run --env=dev -- bun run seed
```

---

### 4. Create API Endpoints
**Goal**: Build the API layer following tRPC patterns.

#### Implementation:
Create a new router file in `packages/api/src/router/your-feature.ts`:

```typescript
import { and, eq } from '@b612/db';
import {
  CreateYourTableSchema,
  YourTable,
  UpdateYourTableSchema
} from '@b612/db/schema';
import type { TRPCRouterRecord } from '@trpc/server';
import { z } from 'zod';

import { protectedProcedure } from '../trpc';

export const yourFeatureRouter = {
  // Get all records
  all: protectedProcedure.query(({ ctx }) => {
    return ctx.db.query.YourTable.findMany({
      orderBy: (items, { desc }) => [desc(items.createdAt)],
      where: eq(YourTable.userId, ctx.auth.userId),
    });
  }),

  // Get by ID
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.query.YourTable.findFirst({
        where: and(
          eq(YourTable.id, input.id),
          eq(YourTable.userId, ctx.auth.userId),
        ),
      });
    }),

  // Create
  create: protectedProcedure
    .input(CreateYourTableSchema)
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .insert(YourTable)
        .values(input)
        .returning();
      return item;
    }),

  // Update
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: UpdateYourTableSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .update(YourTable)
        .set(input.data)
        .where(
          and(
            eq(YourTable.id, input.id),
            eq(YourTable.userId, ctx.auth.userId),
          ),
        )
        .returning();
      return item;
    }),

  // Delete
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(YourTable)
        .where(
          and(
            eq(YourTable.id, input.id),
            eq(YourTable.userId, ctx.auth.userId),
          ),
        );
      return { success: true };
    }),
} satisfies TRPCRouterRecord;
```

#### Register Router:
Add your router to `packages/api/src/root.ts`:

```typescript
import { yourFeatureRouter } from './router/your-feature';

export const appRouter = createTRPCRouter({
  // ... existing routers
  yourFeature: yourFeatureRouter,
});
```

---

### 5. Frontend Integration
**Goal**: Connect the UI to your new API endpoints using the confirmed component locations.

#### Create Custom Hook (Optional):
Create `apps/web-app/src/hooks/use-your-feature.ts`:

```typescript
import { api } from '@b612/api/react';

export function useYourFeature() {
  const {
    data: items,
    isLoading,
    error,
    refetch
  } = api.yourFeature.all.useQuery();

  const createItem = api.yourFeature.create.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const updateItem = api.yourFeature.update.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const deleteItem = api.yourFeature.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  return {
    items,
    isLoading,
    error,
    createItem,
    updateItem,
    deleteItem,
  };
}
```

#### Connect to UI:
**Use the confirmed component locations from Step 2.**

Integrate the API into the identified files:

```typescript
import { useYourFeature } from '@/hooks/use-your-feature';

export default function YourPage() {
  const { items, createItem, isLoading } = useYourFeature();

  const handleCreate = async () => {
    await createItem.mutateAsync({
      // your data
    });
  };

  // ... rest of component
}
```

**Important**: Only modify the files that were confirmed in Step 2. Follow the exact locations and patterns identified during the research phase.

---

## Checklist

Before marking the feature complete, verify:

### Phase 0: Clarification (Step 1)
- [ ] Use case information evaluated
- [ ] Missing information identified
- [ ] Clarifying questions asked (if needed)
- [ ] All requirements clearly understood before proceeding

### Phase 1: Research & Confirmation (Step 2)
- [ ] UI components researched and identified
- [ ] Findings presented to user with file paths and code snippets
- [ ] **User confirmed correct files and approach** ⚠️ CRITICAL
- [ ] Component integration strategy documented

### Phase 2: Implementation (Steps 3-5)
- [ ] Database schema created/updated in `schema.ts`
- [ ] Seed data updated in `seed.ts`
- [ ] Migration generated and applied (`gen-migration` → `migrate`)
- [ ] Database seeded (`/seed` command)
- [ ] API router created in `packages/api/src/router/`
- [ ] Router registered in `packages/api/src/root.ts`
- [ ] Custom hook created (if needed)
- [ ] UI components connected to API (only confirmed files)
- [ ] Feature tested end-to-end
- [ ] Code follows existing patterns and conventions

---

## Common Patterns to Follow

### Database
- Use `createId({ prefix: 'table' })` for IDs
- Include `createdAt` and `updatedAt` timestamps
- Add `userId` with `requestingUserId()` default
- Use cascade delete for user relationships
- Create Insert/Update Zod schemas

### API
- Use `protectedProcedure` for authenticated endpoints
- Always filter by `userId` for security
- Return data from mutations (`.returning()`)
- Use proper Zod validation on inputs
- Follow CRUD pattern: all, byId, create, update, delete

### Frontend
- Use custom hooks for data fetching
- Implement optimistic updates with `refetch`
- Handle loading and error states
- Follow existing component patterns
- Use TypeScript interfaces from schema

---

## Important Workflow Notes

### ⚠️ Clarification & Confirmation Required
**This command requires a THREE-PHASE approach:**

1. **Clarification Phase**: Evaluate requirements and ask questions if needed
2. **Research Phase**: AI researches and presents findings
3. **Implementation Phase**: Only after user confirmation

**Never proceed with database changes, API creation, or UI modifications until:**
1. ✅ All requirements are clearly understood (Step 1)
2. ✅ User has confirmed the UI component locations (Step 2)

### Clarification Phase (Step 1)
Before researching, the AI must:
- Evaluate if the use case provides sufficient detail
- Check for missing information about data, UI, or user flow
- Ask specific clarifying questions (see Step 1 examples)
- Wait for user responses before proceeding to research

### Research Phase (Step 2)
After clarification, when researching, the AI should:
- Use `codebase_search` to find relevant pages/components
- Use `grep` to find specific UI elements (buttons, forms, etc.)
- Read the identified files completely
- Analyze existing patterns and hooks
- Present a clear summary with code snippets
- Ask: "Is this correct? Should I proceed?"

### Implementation Phase (Steps 3-5)
Only after both clarification and confirmation:
- Create database schemas
- Generate migrations
- Create API endpoints
- Modify UI components

---

## Tips

- Review existing implementations (Entries, ShortUrls) for reference
- Test each step before moving to the next
- Keep security in mind (user isolation, input validation)
- Follow TypeScript/React best practices from cursor rules
- Use Bun instead of npm/node commands
- Leverage Infisical for environment variables
- When in doubt during research, search more broadly before asking user
