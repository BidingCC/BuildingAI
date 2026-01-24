# packages/api

Main NestJS API application.

## Location
`packages/api/`

## Structure

```
src/
├── main.ts                    # Entry point
├── modules/                   # Business modules
│   ├── ai/                   # AI modules (chat, datasets, mcp, model, provider)
│   ├── auth/                 # Authentication
│   ├── user/                 # User management
│   ├── system/               # System configuration
│   └── ...                   # Other modules
├── common/                   # Shared API code
│   ├── guards/               # Auth, permissions, etc.
│   ├── decorators/           # Controller decorators
│   ├── filters/              # Exception filters
│   └── interceptors/         # Response interceptors
└── core/                     # Infrastructure
    ├── database/             # Database setup
    ├── logger/               # Logging
    └── queue/                # Queue processors
```

## Path Aliases

- `@common/*` → `src/common/*`
- `@modules/*` → `src/modules/*`
- `@core/*` → `src/core/*`
- `@assets/*` → `src/assets/*`

## Module Structure

```
src/modules/{module-name}/
├── {module-name}.module.ts
├── controllers/
│   ├── web/{name}.controller.ts      # Frontend API (/api/)
│   └── console/{name}.controller.ts  # Admin API (/consoleapi/)
├── services/{name}.service.ts
└── dto/{action}-{name}.dto.ts
```

## Controller Decorators

```typescript
import { ConsoleController, WebController } from "@common/decorators/controller.decorator";

@ConsoleController("users", "User Management")  // Auto auth + permissions
export class UserController {}

@WebController("posts")  // Requires auth by default
export class PostController {}

@WebController("public", { skipAuth: true })  // Skip auth
export class PublicController {}
```

## Guards

Execution order: `DemoGuard` → `AuthGuard` → `ExtensionGuard` → `PermissionsGuard` → `SuperAdminGuard`

```typescript
import { AuthGuard } from "@common/guards/auth.guard";
import { PermissionsGuard } from "@common/guards/permissions.guard";

@UseGuards(AuthGuard, PermissionsGuard)
@Permissions({ code: "user:read", name: "View Users" })
@Get()
async list() {}
```

## Entry Point

```typescript
// main.ts
async function bootstrap() {
    const app = await NestFactory.create(AppModule.register());
    await app.listen(3000);
}
```
