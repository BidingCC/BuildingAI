# @buildingai/vite-plugins

Mobile 相关的 Vite 插件集合，用于增强 uniapp 等移动端项目的开发体验。

## 📦 包含的插件

### 1. uniapp-extensions

自动加载扩展目录中的 uniapp 页面作为分包。

## 🚀 安装

```bash
pnpm add @buildingai/vite-plugins -D
```

## 📖 使用方法

### 方式一：从主入口导入（推荐）

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

### 方式二：从子路径导入

```typescript
import { uniappExtensions } from '@buildingai/vite-plugins/uniapp-extensions'
```

## 🔌 插件列表

### uniapp-extensions

将扩展目录中的 uniapp 页面动态加载为分包。

#### 功能特性

- 🔌 **插件化架构**：扩展目录中的页面自动加载为分包
- 📦 **编译时合并**：零运行时开销
- 🔥 **HMR 支持**：开发时支持热更新
- 📱 **多端支持**：支持小程序、H5 等多端平台
- 🎯 **类型安全**：完整的 TypeScript 支持

#### 配置选项

```typescript
interface ExtensionPluginOptions {
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
   * 是否启用缓存
   * @default true
   */
  enableCache?: boolean

  /**
   * 包含的扩展目录匹配模式
   * @default ['*\/src/uniapp']
   */
  include?: string[]

  /**
   * 排除的扩展目录匹配模式
   * @default []
   */
  exclude?: string[]
}
```

#### 插件配置文件

在扩展目录中创建 `src/uniapp/plugin.config.js`:

```javascript
export default {
  // 插件名称（必须唯一）
  name: 'your-extension',
  
  // 分包根路径
  root: 'your-extension',
  
  // 插件版本（可选）
  version: '1.0.0',
  
  // 是否启用
  enabled: true,
  
  // 页面配置
  pages: [
    {
      path: 'pages/list/index',
      style: {
        navigationBarTitleText: '列表页',
        enablePullDownRefresh: true
      }
    }
  ]
}
```

#### 目录结构

```
extensions/
└── your-extension/
    └── src/
        └── uniapp/
            ├── pages/              # 页面目录
            │   ├── list/
            │   │   └── index.vue
            │   └── detail/
            │       └── index.vue
            ├── components/         # 组件目录（可选）
            ├── static/             # 静态资源（可选）
            └── plugin.config.js    # 配置文件
```

#### 页面路由

扩展页面的路由格式：`/{分包根路径}/{页面路径}`

```typescript
// 跳转到扩展页面
uni.navigateTo({
  url: '/your-extension/pages/list/index'
})
```

## 📚 更多文档

详细文档请查看：[docs/UNIAPP_EXTENSIONS.md](../../../docs/UNIAPP_EXTENSIONS.md)

## 🛠️ 开发

### 构建

```bash
pnpm build
```

### 开发模式

```bash
pnpm dev
```

### 类型检查

```bash
pnpm check-types
```

### Lint

```bash
pnpm lint
pnpm lint:fix
```

## 📝 添加新插件

如果你需要添加新的 Vite 插件：

1. 在 `src/` 目录下创建新的插件目录，例如 `src/your-plugin/`
2. 实现插件逻辑
3. 在 `src/index.ts` 中导出
4. 在 `package.json` 的 `exports` 中添加子路径导出

```json
{
  "exports": {
    "./your-plugin": {
      "require": "./dist/your-plugin/index.js",
      "import": "./dist/your-plugin/index.js",
      "types": "./dist/your-plugin/index.d.ts"
    }
  }
}
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT




