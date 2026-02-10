# packages/client

Desktop client application (Tauri + React).

## Location
`packages/client/`

## Structure

```
src/
├── main.tsx                  # Entry point
├── router/                   # React Router configuration
├── pages/                    # Page components
│   ├── console/             # Admin pages
│   └── [other]/            # Frontend pages
├── layouts/                  # Layout components
│   ├── console/             # Admin layout
│   └── main/                # Main frontend layout
├── components/               # React components
│   ├── ask-assistant-ui/   # AI assistant UI components
│   ├── exception/          # Error pages
│   └── guard/              # Route guards
├── hooks/                   # React hooks
│   ├── use-head.tsx        # Document head management
│   └── use-pagination.tsx  # Pagination hook
├── styles/                  # Global styles
└── utils/                   # Utility functions
src-tauri/                    # Tauri backend (Rust)
```

## Directory Structure

### pages/
- **`pages/console/*`** - Admin management pages
- **`pages/*`** (root level) - Frontend pages

### layouts/
- **`layouts/console/`** - Admin layout with sidebar and navbar
- **`layouts/main/`** - Main frontend layout

### components/
- **`components/ask-assistant-ui/`** - AI assistant UI components
- **`components/exception/`** - Error pages (400, 401, 403, 404, 500, etc.)
- **`components/guard/`** - Route guards

### hooks/
- **`hooks/use-head.tsx`** - Document head management
- **`hooks/use-pagination.tsx`** - Pagination hook (see usage below)

## usePagination Hook

Controlled pagination hook that provides pagination state and a ready-to-use component.

**Usage:**
```typescript
import { usePagination } from "@/hooks/use-pagination";

const PAGE_SIZE = 25;

const MyPage = () => {
  const [queryParams, setQueryParams] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
  });

  const { data } = useQueryHook(queryParams);

  const { PaginationComponent } = usePagination({
    total: data?.total || 0,
    pageSize: PAGE_SIZE,
    page: queryParams.page || 1,
    onPageChange: (page) => {
      setQueryParams((prev) => ({ ...prev, page }));
    },
  });

  return (
    <div>
      {/* Content */}
      <PaginationComponent className="mx-0 w-fit" />
    </div>
  );
};
```

**Features:**
- Fully controlled - parent manages page state
- Returns ready-to-use `PaginationComponent`
- Automatic ellipsis handling for large page counts
- Type-safe with TypeScript

## Tech Stack

- React + TypeScript
- Tauri for desktop integration
- React Router for routing
- TanStack Query for data fetching
- Uses `@buildingai/web/*` packages

## Development

```bash
pnpm dev  # Run dev
pnpm dev:desktop  # Run Tauri dev
pnpm build:desktop  # Build desktop app
```
