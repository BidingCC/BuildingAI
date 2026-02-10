# @buildingai/utils

Utility functions and HTTP client.

## Location
`packages/@buildingai/utils/`

## Exports
- `createHttpClient()` - HTTP client factory
- `defaultHttpClient` - Default HTTP client instance
- Utility functions: `cn()`, `is()`, `helper()`, `file()`, `security()`, `version()`, etc.

## HTTP Client

```typescript
import { createHttpClient } from "@buildingai/utils";

const client = createHttpClient({
    baseURL: "https://api.example.com",
    timeout: 10000,
    retryConfig: { retries: 3 },
});

// GET request
const data = await client.get<User>("/users/123");

// POST request
const result = await client.post<CreateResult>("/users", userData);

// With interceptors
client.interceptors.request.use((config) => {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
});
```

## Utilities

```typescript
import { cn, is, helper } from "@buildingai/utils";

// Class name utility (tailwind-merge)
const className = cn("base", condition && "conditional");

// Type checking
if (is.string(value)) { ... }

// Helper functions
helper.buildWhere({ name: "John" });
```
