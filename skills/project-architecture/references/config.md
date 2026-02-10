# @buildingai/config

Configuration management and environment variable handling.

## Location
`packages/@buildingai/config/`

## Exports
- `createDataSourceConfig()` - Database configuration factory
- Environment utilities from `@buildingai/config/utils/env`

## Usage

```typescript
import { createDataSourceConfig } from "@buildingai/config/db.config";

// Database configuration
const dbConfig = createDataSourceConfig();
```

Environment variables are automatically loaded from `.env` file in project root.
