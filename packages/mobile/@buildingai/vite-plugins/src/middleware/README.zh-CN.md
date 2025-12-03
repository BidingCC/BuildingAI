# uni-middleware

用于 UniApp 中间件系统的 Vite 插件，自动扫描并生成路由守卫的虚拟模块。

## 功能特性

- 🛡️ **路由守卫**：定义中间件函数来保护路由
- 🔍 **自动发现**：自动从目录扫描中间件文件
- 📦 **虚拟模块**：生成包含所有中间件的虚拟模块
- 🔄 **HMR 支持**：中间件变更的热模块替换
- 🎯 **类型安全**：完整的 TypeScript 支持
- 🌐 **全局和页面级**：支持全局和页面特定的中间件
- 🔀 **导航控制**：通过返回值灵活控制导航

## 安装

```bash
pnpm add @buildingai/vite-plugins -D
```

## 使用方法

### 基础配置

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

### 配置选项

```typescript
interface MiddlewarePluginOptions {
  /**
   * 中间件目录路径
   * @default 'src/middleware'
   */
  middlewareDir?: string

  /**
   * pages.json 文件路径
   * @default 'src/pages.json'
   */
  pagesJsonPath?: string

  /**
   * 项目根目录
   * @default process.cwd()
   */
  programRoot?: string
}
```

## 中间件定义

### 基于文件的命名

中间件根据文件结构自动发现。中间件名称从文件路径派生。

**示例文件结构：**
```
src/middleware/
├── auth.ts              # → auth
├── admin/
│   └── check.ts         # → adminCheck
└── user/
    └── profile.ts       # → userProfile
```

### 中间件函数

```typescript
import { defineMiddleware } from '@buildingai/vite-plugins/middleware'
import type { Middleware, Page } from '@buildingai/vite-plugins/middleware'

export default defineMiddleware(async (to: Page, from?: Page) => {
  // 检查认证
  const isAuthenticated = checkAuth()
  
  if (!isAuthenticated) {
    // 返回 false 阻止导航
    return false
    
    // 或重定向到登录页
    // return '/pages/login/index'
    
    // 或使用导航对象
    // return {
    //   url: '/pages/login/index',
    //   method: 'redirectTo'
    // }
  }
  
  // 返回 true 或 undefined 允许导航
  return true
})
```

### 中间件返回类型

```typescript
type MiddlewareReturn =
  | void                    // 允许导航
  | boolean                 // true: 允许, false: 阻止
  | string                  // 重定向到此路径
  | {                       // 导航对象
      url: string
      method: 'navigateTo' | 'redirectTo' | 'switchTab' | 'reLaunch'
      options?: Record<string, any>
    }
```

## pages.json 配置

### 全局中间件

应用到所有页面：

```json
{
  "middleware": ["auth", "adminCheck"]
}
```

### 页面级中间件

应用到特定页面：

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

## 在应用中使用中间件

### 设置导航守卫

```typescript
// main.ts 或 App.vue
import { createApp } from 'vue'
import { createNavigationGuard } from '@buildingai/vite-plugins/middleware'
import { middlewares } from 'virtual:uni-middleware'

const app = createApp(App)
app.use(createNavigationGuard(middlewares))
```

### 导入中间件

```typescript
import { middlewares } from 'virtual:uni-middleware'

// 访问全局中间件
console.log(middlewares.global)

// 访问页面特定的中间件
console.log(middlewares['pages/user/profile'])
```

## 虚拟模块

插件生成虚拟模块 `virtual:uni-middleware`，导出：

```typescript
export const middlewares = {
  global: [authMiddleware, adminCheckMiddleware],
  'pages/user/profile': [authMiddleware, userProfileMiddleware],
  'admin/pages/dashboard': [authMiddleware, adminCheckMiddleware]
}
```

## 中间件执行顺序

1. 全局中间件（按 `pages.json` 中定义的顺序）
2. 页面特定中间件（按 `pages.json` 中定义的顺序）

如果任何中间件返回 `false` 或重定向，后续中间件不会执行。

## 示例

### 认证中间件

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

### 权限检查中间件

```typescript
// src/middleware/admin/check.ts
import { defineMiddleware } from '@buildingai/vite-plugins/middleware'

export default defineMiddleware((to, from) => {
  const userRole = uni.getStorageSync('userRole')
  if (userRole !== 'admin') {
    uni.showToast({
      title: '无权限',
      icon: 'none'
    })
    return false
  }
})
```

### 异步中间件

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

## TypeScript 支持

提供完整的 TypeScript 支持：

```typescript
import type {
  Middleware,
  MiddlewareReturn,
  MiddlewaresMap,
  Page
} from '@buildingai/vite-plugins/middleware'
```

## 工作原理

1. **扫描**：扫描中间件目录查找 `.ts` 和 `.js` 文件
2. **命名**：使用 camelCase 从文件路径生成中间件名称
3. **虚拟模块**：生成包含所有中间件的虚拟模块
4. **配置**：读取 `pages.json` 确定要应用的中间件
5. **HMR**：监听中间件文件和 `pages.json` 的变化

## 注意事项

- 中间件文件必须导出默认函数
- 文件名转换为 camelCase（例如：`user-profile.ts` → `userProfile`）
- 目录结构影响中间件名称（例如：`admin/check.ts` → `adminCheck`）
- `index.ts` 文件使用父目录名称
- 中间件按 `pages.json` 中定义的顺序执行

