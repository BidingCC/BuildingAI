# @buildingai/dict

Dictionary/configuration management with caching.

## Location
`packages/@buildingai/dict/`

## Exports
- `DictModule` - Dictionary module (global)
- `DictService` - Dictionary CRUD service
- `DictCacheService` - Dictionary cache service
- DTOs: `CreateDictDto`, `UpdateDictDto`, `QueryDictDto`

## Usage

```typescript
import { DictModule, DictService } from "@buildingai/dict";

@Module({
    imports: [DictModule],
})
export class AppModule {}

// In service
constructor(private dictService: DictService) {}

// Get dictionary value
const value = await this.dictService.getValue("config.key");

// Get by group
const configs = await this.dictService.getByGroup("payment");

// Create/Update
await this.dictService.create({ key: "key", value: "value", group: "group" });
```
