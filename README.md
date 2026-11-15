# SeaWatts - AI-Powered Full-Stack Startup Template

> A production-ready monorepo template optimized for AI code generation workflows

## Why This Template?

### 🤖 AI-First Architecture
- **BAML Integration**: Structured AI templates for consistent LLM interactions
- **Type-Safe APIs**: End-to-end TypeScript ensures AI generates correct code
- **Shared Context**: Monorepo structure helps AI understand your entire codebase
- **Cross-Platform**: Generate code for web, mobile, desktop, and browser extensions

### 🚀 Production Ready
- **6 Applications**: Web app, mobile (Expo), CLI, Chrome extension, VS Code extension, iOS
- **12 Shared Packages**: Database, API, UI, AI, analytics, payments, and more
- **Modern Stack**: Next.js 15, React 19, oRPC, Drizzle ORM, Supabase
- **Developer Experience**: Bun, Turborepo, Biome, comprehensive tooling

## Quick Start

### 1. Clone and Install
```bash
git clone [your-repo-url] my-startup
cd my-startup
bun install
```

### 2. Environment Setup
Secrets live in Infisical (`.infisical.json`), never in `.env` files.

```bash
# A local PostgreSQL with the app's database roles, every migration applied
# and the connection URLs in .env.database.local
bun db:local
. ./.env.database.local
```

For a hosted database, open a "Database setup" issue from the template in
`.github/ISSUE_TEMPLATE/database-setup.md` and follow
`docs/agents/database-setup.md`: the admin connection string goes into
Infisical, `bun db:bootstrap` makes the roles, `bun db:migrate` applies the
grants and row-level security, and `bun db:verify` proves the isolation.
A Claude session with the admin URL in Infisical (or the Supabase connector)
can run the bootstrap, extensions, migrations and verification by itself.
Copying the admin connection string, turning off Supabase's public Data API
and downloading the database CA need the owner's browser.

### 3. Start Development
```bash
# Start all apps
bun dev

# Or start specific apps
bun dev:next          # Web app only
bun dev:vscode        # VS Code extension
```

## Architecture Overview

### Apps
- **Web App** (`apps/web-app`): Next.js 15 with App Router
- **Mobile** (`apps/expo`): React Native with Expo SDK 51
- **CLI** (`apps/cli`): Cross-platform command-line tool
- **Chrome Extension** (`apps/chrome-extension`): Browser extension
- **VS Code Extension** (`apps/vscode-extension`): Editor extension
- **iOS** (`apps/ios`): Native iOS app

### Packages
- **API** (`packages/api`): oRPC router with end-to-end type safety
- **Database** (`packages/db`): Drizzle ORM with Supabase
- **UI** (`packages/ui`): shadcn/ui components shared across apps
- **AI** (`packages/ai`): BAML templates for structured LLM interactions
- **Analytics** (`packages/analytics`): PostHog integration
- **Payments** (`packages/stripe`): Stripe integration
- **Email** (`packages/email`): Resend email service
- **State** (`packages/zustand`): Global state management

## AI Code Generation Benefits

### 1. **Contextual Understanding**
The monorepo structure allows AI to understand:
- How your API routes connect to database schemas
- Which UI components are available across platforms
- How authentication flows through all apps
- The relationship between packages and their dependencies

### 2. **Consistent Patterns**
- Shared TypeScript configurations
- Unified code formatting with Biome
- Consistent API patterns with oRPC
- Reusable UI components across platforms

### 3. **Rapid Development**
- Generate code for multiple platforms simultaneously
- AI understands your existing patterns and can extend them
- Type safety ensures generated code works correctly
- Shared packages mean changes propagate everywhere

## Development Workflow

### Adding New Features
1. **Define API** in `packages/api/src/router`
2. **Update Database** schema in `packages/db/src/schema`
3. **Generate Types** with `bun db:push`
4. **Create UI** components in `packages/ui`
5. **Implement** across all apps with full type safety

### AI-Assisted Development
```bash
# Add new UI component
bun ui-add

# Generate database migration
bun db:gen-migration

# Type check everything
bun typecheck

# Format code
bun format:fix
```

## Essential Commands

### Development
```bash
# Install dependencies
bun install

# Start development for all packages
bun dev

# Start only the web app
bun dev:next

# Run tests
bun test

# Type check everything
bun typecheck

# Format code
bun format:fix

# Clean all workspaces
bun clean:ws
```

### Database Operations
```bash
# Open database studio
bun db:studio

# Prepare a local database (roles, migrations, isolation check)
bun db:local

# Prove role and tenant isolation against the configured database
bun db:verify

# Generate migrations
bun db:gen-migration

# Run migrations
bun db:migrate

# Seed database
bun db:seed
```

### Building & Publishing
```bash
# Build all packages
bun build

# Publish CLI and client packages
bun publish

# Add UI components
bun ui-add
```

## Deployment

### Web App (Vercel)
```bash
# Deploy to Vercel
vercel --prod
```

### Mobile (EAS)
```bash
cd apps/expo
eas build --platform all
eas submit --platform all
```

### CLI (NPM)
```bash
bun publish
```

## Key Features

- ✅ **End-to-End Type Safety** with oRPC
- ✅ **AI Integration** with BAML templates
- ✅ **Cross-Platform** development
- ✅ **Modern Stack** (Next.js 15, React 19)
- ✅ **Production Ready** with comprehensive tooling
- ✅ **Developer Experience** optimized for AI workflows

## Contributing

This template is designed for rapid startup development with AI assistance. The monorepo structure ensures consistency and enables powerful AI code generation workflows.

## License

MIT