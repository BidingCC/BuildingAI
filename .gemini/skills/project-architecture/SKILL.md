---
name: project-architecture
description: BuildingAI monorepo project structure and architecture guide. Use when AI needs to understand project organization, locate files, understand package relationships, find where specific functionality is implemented, or navigate the codebase structure. Essential for any development task that requires understanding the project layout, import patterns, module organization, or cross-package dependencies.
---

# BuildingAI Project Architecture

Comprehensive guide to BuildingAI monorepo structure, packages, and development patterns.

## When to Use

Use this skill when you need to:
- Locate where specific functionality is implemented
- Understand package relationships and dependencies
- Find the correct import paths and patterns
- Navigate module organization and structure
- Understand development patterns and conventions
- Know what each package provides and how to use it

## Instructions

### Understanding the Monorepo Structure

The BuildingAI project is a pnpm workspace monorepo with the following structure:

```
buildingai/
├── packages/
│   ├── @buildingai/              # Shared packages
│   │   ├── ai-sdk/                 # AI SDK (legacy)
│   │   ├── ai-sdk-new/             # AI SDK (Vercel AI SDK 6.x)
│   │   ├── base/                   # BaseController, BaseService
│   │   ├── cache/                  # CacheService, RedisService
│   │   ├── config/                 # Configuration management
│   │   ├── constants/               # Shared constants
│   │   ├── db/                     # TypeORM, entities, migrations
│   │   ├── decorators/             # Custom decorators
│   │   ├── di/                     # Dependency injection utilities
│   │   ├── dict/                   # Dictionary/configuration management
│   │   ├── dto/                    # Shared DTOs
│   │   ├── errors/                 # HttpErrorFactory
│   │   ├── eslint-config/          # ESLint configuration
│   │   ├── extension-sdk/          # Extension development SDK
│   │   ├── logger/                 # Logging utilities
│   │   ├── pipe/                   # Validation pipes
│   │   ├── types/                  # TypeScript type definitions
│   │   ├── typescript-config/      # TypeScript configurations
│   │   ├── upgrade/                # Version upgrade scripts
│   │   ├── utils/                  # Utility functions, HTTP client
│   │   ├── web/                    # Frontend shared packages
│   │   │   ├── hooks/              # React hooks
│   │   │   ├── http/               # HTTP client
│   │   │   ├── services/           # Frontend services
│   │   │   ├── stores/             # State management (Pinia)
│   │   │   ├── types/              # TypeScript types
│   │   │   └── ui/                 # UI components
│   │   ├── di/                     # Dependency injection utilities
│   │   └── wechat-sdk/             # WeChat integration SDK
│   ├── api/                        # Main NestJS API application
│   ├── core/                       # Reusable business logic modules
│   ├── cli/                        # CLI tooling
│   └── client/                     # Desktop client (Tauri + React)
├── skills/                         # AI skills for development guidance
├── extensions/                     # Plugin extensions (runtime loaded)
├── public/                         # Static web assets
└── scripts/                        # Build and utility scripts
```

### Using Reference Files

For detailed information about each package, consult the corresponding reference file in `references/`:

**@buildingai Packages:**
- `references/base.md` - BaseController, BaseService
- `references/cache.md` - CacheService, RedisService
- `references/config.md` - Configuration management
- `references/constants.md` - Shared constants
- `references/db.md` - Database layer (TypeORM, entities)
- `references/decorators.md` - Custom decorators
- `references/dict.md` - Dictionary management
- `references/dto.md` - Shared DTOs
- `references/errors.md` - Error handling
- `references/logger.md` - Logging utilities
- `references/utils.md` - Utility functions, HTTP client
- `references/ai-sdk.md` - AI SDK packages
- `references/web.md` - Frontend packages
- `references/extension-sdk.md` - Extension SDK
- `references/pipe.md` - Validation pipes
- `references/types.md` - TypeScript types
- `references/upgrade.md` - Version upgrade scripts
- `references/di.md` - Dependency injection utilities
- `references/wechat-sdk.md` - WeChat integration SDK

**Main Packages:**
- `references/api.md` - Main NestJS API application
- `references/core.md` - Reusable business logic
- `references/cli.md` - CLI tooling
- `references/client.md` - Desktop client

Load these reference files when you need detailed information about a specific package's exports, usage patterns, or implementation details.

### Import Patterns

**Backend (API/Core) Import Order:**
1. `@buildingai/*` packages
2. `@nestjs/*` packages
3. `@common/*` (API only)
4. `@modules/*` (API only)
5. `@core/*` (API only)
6. Third-party packages
7. Relative paths

**Path Aliases (API):**
- `@common/*` → `src/common/*`
- `@modules/*` → `src/modules/*`
- `@core/*` → `src/core/*`
- `@assets/*` → `src/assets/*`

### Development Patterns

**Service Pattern:**
- Extend `BaseService<Entity>` from `@buildingai/base` for CRUD operations
- Use dependency injection with `@InjectRepository()` for repositories
- See `references/base.md` for available methods and features

**Controller Pattern:**
- Use `@ConsoleController(path, groupName)` for admin APIs (auto auth + permissions)
- Use `@WebController(path)` for frontend APIs (requires auth by default)
- Use `@Playground()` decorator to get current user
- See `references/decorators.md` and `references/api.md` for details

**Module Structure: `src/modules/{module-name}/` with controllers, services, and DTOs

### Quick Navigation

When implementing features, reference the appropriate package:
- **Authentication**: `references/decorators.md` (`@Playground()`), `references/api.md` (guards)
- **Database**: `references/db.md` (entities), `references/base.md` (BaseService CRUD)
- **Error Handling**: `references/errors.md` (HttpErrorFactory)
- **Caching**: `references/cache.md` (CacheService, RedisService)
- **File Upload**: `references/core.md` (upload services)
- **AI Functionality**: `references/ai-sdk.md`, `references/api.md` (AI modules)
- **Frontend**: `references/web.md` (services, stores, UI components)

### Skills Integration

This skill works with other skills:
- **`postgresql-table-design`** - For database schema design
- **`frontend-design`** - For frontend UI development
- **`ai-sdk`** - For AI functionality implementation

When implementing features, reference the appropriate package reference file to understand what's available and how to use it.
