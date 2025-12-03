# uniapp-extensions

A Vite plugin for automatically loading UniApp extension pages as sub-packages.

## Features

- 🔌 **Plugin Architecture**: Automatically loads pages from extension directories as sub-packages
- 📦 **Zero Runtime Overhead**: Merged at compile time
- 🔥 **HMR Support**: Hot module replacement during development
- 📱 **Multi-platform Support**: Supports mini-programs, H5, and other platforms
- 🎯 **Type Safety**: Full TypeScript support
- 🔗 **Symlink Management**: Automatically creates and manages symlinks for extensions

## Installation

```bash
pnpm add @buildingai/vite-plugins -D
```

## Usage

### Basic Setup

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

### Options

```typescript
interface PluginOptions {
  /**
   * Extension directory relative path
   * @default '../../../extensions'
   */
  extensionsDir?: string

  /**
   * Enable hot module replacement
   * @default true
   */
  enableHmr?: boolean

  /**
   * Include patterns for extension directories
   * @default ['*/src/uniapp']
   */
  include?: string[]

  /**
   * Exclude patterns for extension directories
   * @default []
   */
  exclude?: string[]
}
```

## Extension Configuration

Create a `uniapp.config.ts` file in your extension's `src/uniapp/` directory:

```typescript
import { defineExtension } from '@buildingai/vite-plugins'

export default defineExtension({
  // Extension name (must be unique)
  name: 'my-extension',
  
  // Sub-package root path
  root: 'my-extension',
  
  // Extension version (optional)
  version: '1.0.0',
  
  // Enable/disable extension
  enabled: true,
  
  // Page configurations
  pages: [
    {
      path: 'pages/list/index',
      style: {
        navigationBarTitleText: 'List Page',
        enablePullDownRefresh: true,
        navigationBarBackgroundColor: '#ffffff',
        navigationBarTextStyle: 'black'
      }
    },
    {
      path: 'pages/detail/index',
      style: {
        navigationBarTitleText: 'Detail Page'
      }
    }
  ]
})
```

## Directory Structure

```
extensions/
└── my-extension/
    └── src/
        └── uniapp/
            ├── pages/              # Page directory
            │   ├── list/
            │   │   └── index.vue
            │   └── detail/
            │       └── index.vue
            ├── components/         # Components (optional)
            ├── static/             # Static assets (optional)
            └── uniapp.config.ts    # Configuration file
```

## Page Routing

Extension pages are accessible via the route format: `/{sub-package-root}/{page-path}`

```typescript
// Navigate to extension page
uni.navigateTo({
  url: '/my-extension/pages/list/index'
})
```

## API

### `uniappExtensions(options?)`

Creates a Vite plugin instance for loading extensions.

### `loadExtensionSubPackages(extensionsDir?, options?)`

Utility function to load extension sub-packages programmatically.

```typescript
import { loadExtensionSubPackages } from '@buildingai/vite-plugins'

const subPackages = await loadExtensionSubPackages('../../../extensions')
// Returns: Array<{ root: string; pages: any[] }>
```

### `defineExtension(config)`

Type helper for defining extension configuration with full type safety.

## How It Works

1. **Discovery**: The plugin scans the extensions directory for `uniapp.config.ts` files
2. **Validation**: Validates each extension configuration and checks if pages exist
3. **Symlink Creation**: Creates symlinks in the main project's `src/` directory
4. **Vite Integration**: Configures Vite to watch extension directories for HMR
5. **Cleanup**: Removes symlinks after build completion

## Development

The plugin automatically:
- Watches extension directories for changes
- Updates symlinks when extensions are added/removed
- Invalidates Vite cache when extension configs change
- Supports hot module replacement for extension pages

## TypeScript Support

Full TypeScript support is provided through exported types:

```typescript
import type { ExtensionConfig, PageConfig, PluginOptions } from '@buildingai/vite-plugins'
```

## Notes

- Extensions with `enabled: false` are skipped
- Extensions without valid page files are skipped
- Symlinks are created in `src/{extension.root}` directory
- The plugin runs with `enforce: 'pre'` to ensure it runs before other plugins

