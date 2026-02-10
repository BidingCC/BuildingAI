# @buildingai/web

Frontend shared packages.

## Location
`packages/@buildingai/web/`

## Sub-packages

### @buildingai/web/hooks
React hooks: `useCopy()`, `useDocumentHead()`, `useRefreshUser()`, `useRefreshWebsiteConfig()`

### @buildingai/web/http
HTTP client for frontend API calls.

### @buildingai/web/services
Frontend service functions organized by scope, using React Query (TanStack Query).

**Structure:**
- `console/` - Admin API services (chat, extension, provider, recharge, secret, user)
- `web/` - Frontend API services (ai-provider, auth, chat, chat-feedback, mcp)
- `shared/` - Shared services (config, upload, user)

**Naming Convention:**
- Query hooks: `useXxxQuery()` - For data fetching
- Mutation hooks: `useXxxMutation()` - For data mutations (create, update, delete)
- Plain functions: `getXxx()`, `uploadXxx()` - For direct API calls without React Query

**Usage Style:**
```typescript
import { useConversationsQuery, useDeleteConversation } from "@buildingai/services/web";
import { useUsersListQuery, useCreateUserMutation } from "@buildingai/services/console";

// Query (data fetching)
const { data, isLoading } = useConversationsQuery({ page: 1, pageSize: 10 });
const { data: user } = useUserDetailQuery(userId, { enabled: !!userId });

// Mutation (data modification)
const deleteMutation = useDeleteConversation();
deleteMutation.mutate(conversationId);

const createMutation = useCreateUserMutation({
    onSuccess: () => {
        // Invalidate queries after success
    },
});
createMutation.mutate({ username: "user", password: "pass" });
```

**Features:**
- Automatic query key management
- Query invalidation on mutations
- Type-safe with TypeScript
- Supports pagination (`PaginatedQueryOptionsUtil`, `PaginatedResponse`)
- Supports standard React Query options (`QueryOptionsUtil`, `MutationOptionsUtil`)

### @buildingai/web/stores
State management using Zustand.

**Exports:**
- `createStore()` - Create Zustand store with optional persistence
- `useAuthStore` - Authentication store
- `useConfigStore` - Configuration store
- Storage utilities: `getLocalStorage()`, `safeJsonParse()`, `safeJsonStringify()`

### @buildingai/web/types
TypeScript type definitions for frontend.

### @buildingai/web/ui
React UI components library based on shadcn/ui.

**Components:**
- `ui/` - shadcn/ui component library (buttons, forms, dialogs, tables, etc., ...)
- `ai-elements/` - AI-specific components (message, code-block, prompt-input, etc., ...)
- Other components: theme providers, scroll components, effects

**Import Pattern:**
```typescript
import { ComponentName } from "@buildingai/ui/components/ui/component-name";
import { ComponentName } from "@buildingai/ui/components/ai-elements/component-name";
```

**Global Styles:**
Located in `@buildingai/ui/src/styles/`, uses shadcn/ui styling conventions with CSS variables for theming (light/dark mode support).
