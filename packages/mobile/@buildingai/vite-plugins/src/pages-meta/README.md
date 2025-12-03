# uni-pages-meta

A Vite plugin that reads `pages.json` and generates a virtual module with page metadata for easy access in your UniApp project.

## Features

- 📄 **Page Metadata**: Access page configuration from `pages.json`
- 🔍 **Easy Lookup**: Helper functions to get page meta by path
- 📦 **Virtual Module**: Generates virtual module with all page metadata
- 🔄 **HMR Support**: Hot module replacement when `pages.json` changes
- 🎯 **Type Safety**: Full TypeScript support
- 🌐 **Sub-packages Support**: Supports both main pages and sub-packages

## Installation

```bash
pnpm add @buildingai/vite-plugins -D
```

## Usage

### Basic Setup

```typescript
import { uniPagesMeta } from '@buildingai/vite-plugins'
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [
    uniPagesMeta({
      pagesJsonPath: 'src/pages.json'
    }),
    uni()
  ]
})
```

### Options

```typescript
interface PagesMetaPluginOptions {
  /**
   * Pages.json file path
   * @default 'src/pages.json'
   */
  pagesJsonPath?: string
}
```

## Using Page Metadata

### Import Virtual Module

```typescript
import {
  pagesMeta,
  getPageMeta,
  getPageTitle,
  getCurrentPageMeta,
  getCurrentPageTitle
} from 'virtual:pages-meta'
```

### Access All Pages

```typescript
import { pagesMeta } from 'virtual:pages-meta'

// Get all page metadata
console.log(pagesMeta)
// {
//   'pages/index/index': { path: 'pages/index/index', style: {...} },
//   'pages/user/profile': { path: 'pages/user/profile', style: {...} },
//   ...
// }
```

### Get Page Meta by Path

```typescript
import { getPageMeta } from 'virtual:pages-meta'

// Get metadata for a specific page
const meta = getPageMeta('pages/user/profile')
console.log(meta?.style?.navigationBarTitle) // "User Profile"
```

### Get Page Title

```typescript
import { getPageTitle } from 'virtual:pages-meta'

// Get navigation bar title for a page
const title = getPageTitle('pages/user/profile')
console.log(title) // "User Profile"
```

### Get Current Page Meta

```typescript
import { getCurrentPageMeta, getCurrentPageTitle } from 'virtual:pages-meta'

// In a Vue component
export default {
  mounted() {
    // Get current page metadata
    const meta = getCurrentPageMeta()
    console.log(meta)
    
    // Get current page title
    const title = getCurrentPageTitle()
    console.log(title)
  }
}
```

## API Reference

### `pagesMeta`

A map of all page metadata, keyed by page path.

```typescript
interface PagesMetaMap {
  [path: string]: PageMeta
}

interface PageMeta {
  path: string
  style?: {
    navigationBarTitle?: string
    navigationBarBackgroundColor?: string
    navigationBarTextStyle?: string
    [key: string]: any
  }
  [key: string]: any
}
```

### `getPageMeta(path: string): PageMeta | null`

Get page metadata by path. Returns `null` if page not found.

**Parameters:**
- `path`: Page path (with or without leading slash, query params are ignored)

**Returns:** Page metadata object or `null`

### `getPageTitle(path: string): string`

Get navigation bar title for a page.

**Parameters:**
- `path`: Page path

**Returns:** Navigation bar title or empty string

### `getCurrentPageMeta(): PageMeta | null`

Get metadata for the current page using `getCurrentPages()`.

**Returns:** Current page metadata or `null`

### `getCurrentPageTitle(): string`

Get navigation bar title for the current page.

**Returns:** Current page title or empty string

## Examples

### Dynamic Page Title

```typescript
import { getPageMeta } from 'virtual:pages-meta'

// Set page title dynamically
function setPageTitle(path: string) {
  const meta = getPageMeta(path)
  if (meta?.style?.navigationBarTitle) {
    uni.setNavigationBarTitle({
      title: meta.style.navigationBarTitle
    })
  }
}
```

### Check Page Configuration

```typescript
import { getPageMeta } from 'virtual:pages-meta'

// Check if page has pull-to-refresh enabled
function hasPullToRefresh(path: string): boolean {
  const meta = getPageMeta(path)
  return meta?.style?.enablePullDownRefresh === true
}
```

### Get All Page Paths

```typescript
import { pagesMeta } from 'virtual:pages-meta'

// Get all page paths
const allPaths = Object.keys(pagesMeta)
console.log(allPaths)
```

### Filter Pages by Style

```typescript
import { pagesMeta } from 'virtual:pages-meta'

// Find all pages with custom background color
const pagesWithCustomBg = Object.values(pagesMeta).filter(
  (meta) => meta.style?.navigationBarBackgroundColor
)
```

## pages.json Format

The plugin reads standard UniApp `pages.json` format:

```json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "navigationBarTitle": "Home",
        "navigationBarBackgroundColor": "#ffffff",
        "navigationBarTextStyle": "black",
        "enablePullDownRefresh": true
      }
    }
  ],
  "subPackages": [
    {
      "root": "user",
      "pages": [
        {
          "path": "pages/profile",
          "style": {
            "navigationBarTitle": "Profile"
          }
        }
      ]
    }
  ]
}
```

Sub-package pages are automatically resolved to full paths:
- `user/pages/profile` → `user/pages/profile`

## TypeScript Support

Full TypeScript support is provided:

```typescript
import type {
  PageMeta,
  PagesMetaMap,
  PagesMetaPluginOptions
} from '@buildingai/vite-plugins'
```

## How It Works

1. **Read Configuration**: Reads `pages.json` file (supports JSONC format)
2. **Parse Pages**: Extracts page metadata from main pages and sub-packages
3. **Generate Module**: Creates virtual module with all page metadata
4. **Helper Functions**: Generates utility functions for easy access
5. **HMR**: Watches `pages.json` for changes and updates virtual module

## Notes

- Supports JSONC format (JSON with comments)
- Paths are normalized (leading slashes removed, query params ignored)
- Sub-package pages are resolved to full paths
- Returns `null` for non-existent pages
- Empty string is returned when title is not found

