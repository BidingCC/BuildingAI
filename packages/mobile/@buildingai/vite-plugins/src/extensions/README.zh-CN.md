# uniapp-extensions

用于自动加载 UniApp 扩展页面作为分包的 Vite 插件。

## 功能特性

- 🔌 **插件化架构**：自动从扩展目录加载页面作为分包
- 📦 **零运行时开销**：编译时合并
- 🔥 **HMR 支持**：开发时支持热更新
- 📱 **多端支持**：支持小程序、H5 等多端平台
- 🎯 **类型安全**：完整的 TypeScript 支持
- 🔗 **软链接管理**：自动创建和管理扩展的软链接

## 安装

```bash
pnpm add @buildingai/vite-plugins -D
```

## 使用方法

### 基础配置

```typescript
import { uniappExtensions } from '@buildingai/vite-plugins'
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [
    uniappExtensions({
      extensionsDir: '../../../extensions',
      enableHmr: true
    }),
    uni()
  ]
})
```

### 配置选项

```typescript
interface PluginOptions {
  /**
   * 扩展目录的相对路径
   * @default '../../../extensions'
   */
  extensionsDir?: string

  /**
   * 是否启用热更新
   * @default true
   */
  enableHmr?: boolean

  /**
   * 包含的扩展目录匹配模式
   * @default ['*/src/uniapp']
   */
  include?: string[]

  /**
   * 排除的扩展目录匹配模式
   * @default []
   */
  exclude?: string[]
}
```

## 扩展配置

在扩展的 `src/uniapp/` 目录下创建 `uniapp.config.ts` 文件：

```typescript
import { defineExtension } from '@buildingai/vite-plugins'

export default defineExtension({
  // 扩展名称（必须唯一）
  name: 'my-extension',
  
  // 分包根路径
  root: 'my-extension',
  
  // 扩展版本（可选）
  version: '1.0.0',
  
  // 是否启用扩展
  enabled: true,
  
  // 页面配置
  pages: [
    {
      path: 'pages/list/index',
      style: {
        navigationBarTitleText: '列表页',
        enablePullDownRefresh: true,
        navigationBarBackgroundColor: '#ffffff',
        navigationBarTextStyle: 'black'
      }
    },
    {
      path: 'pages/detail/index',
      style: {
        navigationBarTitleText: '详情页'
      }
    }
  ]
})
```

## 目录结构

```
extensions/
└── my-extension/
    └── src/
        └── uniapp/
            ├── pages/              # 页面目录
            │   ├── list/
            │   │   └── index.vue
            │   └── detail/
            │       └── index.vue
            ├── components/         # 组件目录（可选）
            ├── static/             # 静态资源（可选）
            └── uniapp.config.ts    # 配置文件
```

## 页面路由

扩展页面的路由格式：`/{分包根路径}/{页面路径}`

```typescript
// 跳转到扩展页面
uni.navigateTo({
  url: '/my-extension/pages/list/index'
})
```

## API

### `uniappExtensions(options?)`

创建用于加载扩展的 Vite 插件实例。

### `loadExtensionSubPackages(extensionsDir?, options?)`

以编程方式加载扩展分包的实用函数。

```typescript
import { loadExtensionSubPackages } from '@buildingai/vite-plugins'

const subPackages = await loadExtensionSubPackages('../../../extensions')
// 返回: Array<{ root: string; pages: any[] }>
```

### `defineExtension(config)`

用于定义扩展配置的类型辅助函数，提供完整的类型安全。

## 工作原理

1. **发现**：插件扫描扩展目录查找 `uniapp.config.ts` 文件
2. **验证**：验证每个扩展配置并检查页面是否存在
3. **创建软链接**：在主项目的 `src/` 目录中创建软链接
4. **Vite 集成**：配置 Vite 监听扩展目录以支持 HMR
5. **清理**：构建完成后删除软链接

## 开发

插件自动：
- 监听扩展目录的变化
- 当扩展被添加/删除时更新软链接
- 当扩展配置更改时使 Vite 缓存失效
- 支持扩展页面的热模块替换

## TypeScript 支持

通过导出的类型提供完整的 TypeScript 支持：

```typescript
import type { ExtensionConfig, PageConfig, PluginOptions } from '@buildingai/vite-plugins'
```

## 注意事项

- `enabled: false` 的扩展会被跳过
- 没有有效页面文件的扩展会被跳过
- 软链接创建在 `src/{extension.root}` 目录中
- 插件以 `enforce: 'pre'` 运行，确保在其他插件之前运行

