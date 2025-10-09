# Cove - AI-Powered Full-Stack Startup Template

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
- **Modern Stack**: Next.js 15, React 19, tRPC v11, Drizzle ORM, Supabase
- **Developer Experience**: Bun, Turborepo, Biome, comprehensive tooling

## Quick Start

### 1. Clone and Install
```bash
git clone [your-repo-url] my-startup
cd my-startup
bun install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Configure your environment variables
bun with-env -- bun db:push
```

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
- **API** (`packages/api`): tRPC v11 router with end-to-end type safety
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
- Consistent API patterns with tRPC
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

# Push schema changes
bun db:push

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

- ✅ **End-to-End Type Safety** with tRPC
- ✅ **AI Integration** with BAML templates
- ✅ **Cross-Platform** development
- ✅ **Modern Stack** (Next.js 15, React 19)
- ✅ **Production Ready** with comprehensive tooling
- ✅ **Developer Experience** optimized for AI workflows

## Contributing

This template is designed for rapid startup development with AI assistance. The monorepo structure ensures consistency and enables powerful AI code generation workflows.

## License

MIT