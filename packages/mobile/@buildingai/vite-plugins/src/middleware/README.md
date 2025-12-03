# uni-middleware

A Vite plugin for UniApp middleware system that automatically scans and generates virtual modules for route guards.

## Features

- 🛡️ **Route Guards**: Define middleware functions to protect routes
- 🔍 **Auto Discovery**: Automatically scans middleware files from directory
- 📦 **Virtual Module**: Generates virtual module with all middlewares
- 🔄 **HMR Support**: Hot module replacement for middleware changes
- 🎯 **Type Safety**: Full TypeScript support
- 🌐 **Global & Page-level**: Support both global and page-specific middlewares
- 🔀 **Navigation Control**: Flexible navigation control with return values

## Installation

```bash
pnpm add @buildingai/vite-plugins -D
```

## Usage

### Basic Setup

```typescript
import { uniMiddleware } from '@buildingai/vite-plugins'
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [
    uniMiddleware({
      middlewareDir: 'src/middleware',
      pagesJsonPath: 'src/pages.json'
    }),
    uni()
  ]
})
```

### Options

```typescript
interface MiddlewarePluginOptions {
  /**
   * Middleware directory path
   * @default 'src/middleware'
   */
  middlewareDir?: string

  /**
   * Pages.json file path
   * @default 'src/pages.json'
   */
  pagesJsonPath?: string

  /**
   * Program root directory
   * @default process.cwd()
   */
  programRoot?: string
}
```

## Middleware Definition

### File-based Naming

Middlewares are automatically discovered based on file structure. The middleware name is derived from the file path.

**Example file structure:**
```
src/middleware/
├── auth.ts              # → auth
├── admin/
│   └── check.ts         # → adminCheck
└── user/
    └── profile.ts       # → userProfile
```

### Middleware Function

```typescript
import { defineMiddleware } from '@buildingai/vite-plugins/middleware'
import type { Middleware, Page } from '@buildingai/vite-plugins/middleware'

export default defineMiddleware(async (to: Page, from?: Page) => {
  // Check authentication
  const isAuthenticated = checkAuth()
  
  if (!isAuthenticated) {
    // Return false to prevent navigation
    return false
    
    // Or redirect to login
    // return '/pages/login/index'
    
    // Or use navigation object
    // return {
    //   url: '/pages/login/index',
    //   method: 'redirectTo'
    // }
  }
  
  // Return true or undefined to allow navigation
  return true
})
```

### Middleware Return Types

```typescript
type MiddlewareReturn =
  | void                    // Allow navigation
  | boolean                 // true: allow, false: prevent
  | string                  // Redirect to this path
  | {                       // Navigation object
      url: string
      method: 'navigateTo' | 'redirectTo' | 'switchTab' | 'reLaunch'
      options?: Record<string, any>
    }
```

## Configuration in pages.json

### Global Middleware

Apply middleware to all pages:

```json
{
  "middleware": ["auth", "adminCheck"]
}
```

### Page-level Middleware

Apply middleware to specific pages:

```json
{
  "pages": [
    {
      "path": "pages/user/profile",
      "middleware": ["auth", "userProfile"]
    }
  ],
  "subPackages": [
    {
      "root": "admin",
      "pages": [
        {
          "path": "pages/dashboard",
          "middleware": ["auth", "adminCheck"]
        }
      ]
    }
  ]
}
```

## Using Middlewares in App

### Setup Navigation Guard

```typescript
// main.ts or App.vue
import { createApp } from 'vue'
import { createNavigationGuard } from '@buildingai/vite-plugins/middleware'
import { middlewares } from 'virtual:uni-middleware'

const app = createApp(App)
app.use(createNavigationGuard(middlewares))
```

### Import Middlewares

```typescript
import { middlewares } from 'virtual:uni-middleware'

// Access global middlewares
console.log(middlewares.global)

// Access page-specific middlewares
console.log(middlewares['pages/user/profile'])
```

## Virtual Module

The plugin generates a virtual module `virtual:uni-middleware` that exports:

```typescript
export const middlewares = {
  global: [authMiddleware, adminCheckMiddleware],
  'pages/user/profile': [authMiddleware, userProfileMiddleware],
  'admin/pages/dashboard': [authMiddleware, adminCheckMiddleware]
}
```

## Middleware Execution Order

1. Global middlewares (in order defined in `pages.json`)
2. Page-specific middlewares (in order defined in `pages.json`)

If any middleware returns `false` or a redirect, subsequent middlewares are not executed.

## Examples

### Authentication Middleware

```typescript
// src/middleware/auth.ts
import { defineMiddleware } from '@buildingai/vite-plugins/middleware'

export default defineMiddleware((to, from) => {
  const token = uni.getStorageSync('token')
  if (!token) {
    return {
      url: '/pages/login/index',
      method: 'redirectTo'
    }
  }
})
```

### Permission Check Middleware

```typescript
// src/middleware/admin/check.ts
import { defineMiddleware } from '@buildingai/vite-plugins/middleware'

export default defineMiddleware((to, from) => {
  const userRole = uni.getStorageSync('userRole')
  if (userRole !== 'admin') {
    uni.showToast({
      title: 'No permission',
      icon: 'none'
    })
    return false
  }
})
```

### Async Middleware

```typescript
// src/middleware/user/profile.ts
import { defineMiddleware } from '@buildingai/vite-plugins/middleware'

export default defineMiddleware(async (to, from) => {
  const userInfo = await fetchUserInfo()
  if (!userInfo.profileComplete) {
    return '/pages/user/complete-profile'
  }
})
```

## TypeScript Support

Full TypeScript support is provided:

```typescript
import type {
  Middleware,
  MiddlewareReturn,
  MiddlewaresMap,
  Page
} from '@buildingai/vite-plugins/middleware'
```

## How It Works

1. **Scanning**: Scans middleware directory for `.ts` and `.js` files
2. **Naming**: Generates middleware names from file paths using camelCase
3. **Virtual Module**: Generates virtual module with all middlewares
4. **Configuration**: Reads `pages.json` to determine which middlewares to apply
5. **HMR**: Watches middleware files and `pages.json` for changes

## Notes

- Middleware files must export a default function
- File names are converted to camelCase (e.g., `user-profile.ts` → `userProfile`)
- Directory structure affects middleware names (e.g., `admin/check.ts` → `adminCheck`)
- `index.ts` files use the parent directory name
- Middlewares are executed in the order defined in `pages.json`

