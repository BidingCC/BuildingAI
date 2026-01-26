# Migration Scripts

## 主程序迁移

```bash
# 自动生成
pnpm --filter @buildingai/db migration:generate <version> <description>

# 手动创建
pnpm --filter @buildingai/db migration:create <version> <description>
```

## 插件迁移

```bash
# 自动生成
pnpm --filter @buildingai/db migration:generate:extension <identifier> <version> <description>

# 手动创建
pnpm --filter @buildingai/db migration:create:extension <identifier> <version> <description>
```

**示例:**

```bash
pnpm --filter @buildingai/db migration:generate:extension buildingai-simple-blog 0.0.3 add-tags
```
