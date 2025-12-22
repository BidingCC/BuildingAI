# Components Directory

This directory contains all Vue components for the project, configured as an independent subpackage using the `@uni-ku/bundle-optimizer` plugin to optimize the main bundle size and support cross-package component usage.

## 📦 Subpackage Optimization

This directory uses the `@uni-ku/bundle-optimizer` plugin for subpackage processing, with the following benefits:

- **Reduce Main Bundle Size**: Separate component code from the main bundle to reduce its size
- **On-Demand Loading**: Components are loaded on-demand, improving application startup speed
- **Cross-Package Usage**: Support component usage across different subpackages while maintaining code organization flexibility

## 📁 Directory Structure

```
components/
├── ask-assistant-chat/      # AI assistant chat components
├── bd-*.vue                  # BuildingAI custom components
├── login/                    # Login related components
├── model-select/             # Model selection component
├── user/                     # User related components
├── widget/                   # Widget components
├── uni_modules/              # Third-party UniApp component libraries
│   ├── stream-client/        # Stream client component
│   ├── half-popup/           # Half-screen popup component
│   └── ...                   # Other third-party components
└── index.vue                 # Subpackage entry file
```

## 🎯 Component Categories

### Custom Components

- **bd-***: BuildingAI brand component series
  - `bd-action-sheet.vue` - Action sheet
  - `bd-checkbox.vue` - Checkbox
  - `bd-image.vue` - Image component
  - `bd-markdown/` - Markdown renderer component
  - `bd-modal.vue` - Modal dialog
  - `bd-navbar.vue` - Navigation bar
  - `bd-picker.vue` - Picker
  - `bd-separator.vue` - Separator

### Business Components

- **ask-assistant-chat/**: AI assistant chat components
- **login/**: Login related components
- **model-select/**: Model selection component
- **user/**: User related components
- **widget/**: Widget components

### Third-Party Components

Located in the `uni_modules/` directory, including:
- `stream-client` - Stream data client
- `half-popup` - Half-screen popup
- `mp-html` - HTML renderer component
- `swipe-drawer` - Swipe drawer
- Other UniApp official and community components


### Cross-Package Usage

Since components are in an independent subpackage, they can be used in the main package and other subpackages:

```vue
<script setup>
// Components are automatically loaded from the subpackage
import BdModal from '@/components/bd-modal.vue?async'
</script>
```

## ⚙️ Configuration

Subpackage configuration is located in `pages.config.ts`:

```typescript
subPackages: [
  {
    root: "components/",
    pages: [{ path: "index" }],
  },
]
```

Optimization configuration is located in `vite.config.ts`:

```typescript
Optimization({
  enable: {
    optimization: true,
    "async-import": true,
    "async-component": true,
  },
})
```

## 📝 Notes

1. **Component Naming**: Custom components should use the `bd-` prefix to avoid conflicts with third-party components
2. **Type Definitions**: Component type definitions are automatically generated in `src/types/components.d.ts`
3. **Async Components**: Support async loading using the `?async` suffix
4. **Subpackage Size**: Pay attention to controlling subpackage size to avoid affecting loading performance

## 🔗 Related Links

- [@uni-ku/bundle-optimizer Documentation](https://github.com/uni-ku/bundle-optimizer)
- [UniApp Subpackage Configuration](https://uniapp.dcloud.net.cn/collocation/pages.html#subpackages)
- [UniHelper Components Plugin](https://uni-helper.js.org/vite-plugin-uni-components/)

