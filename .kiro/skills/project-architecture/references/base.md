# @buildingai/base

Base controller and service classes.

## Location
`packages/@buildingai/base/`

## Exports
- `BaseController` - Base controller with `paginationResult()` method
- `BaseService<T>` - Generic service with CRUD operations

## BaseService<T>

### Methods
- `findOne(options?)`, `findOneById(id, options?)`, `findAll(options?)`
- `paginate(paginationDto, options?)` - Returns `{items, total, page, pageSize, totalPages}`
- `paginateQueryBuilder(queryBuilder, paginationDto, ...)` - Advanced pagination with QueryBuilder
- `create(dto, options?)`, `createMany(dtos, options?)`
- `updateById(id, dto, options?)`, `update(dto, options?)`
- `delete(id, options?)`, `deleteMany(ids, options?)`, `restore(id, options?)`
- `count(options?)` - Count records

### Features
- Field filtering: `excludeFields: ["password"]` or `includeFields: ["id", "name"]` (supports nested paths)
- Lock support: `lock: { type: LockType.OPTIMISTIC/PESSIMISTIC_WRITE, ... }`
- Transaction: `withTransaction(async (manager) => {...})`
- PostgreSQL helpers: `ilike()`, `textSearch()`, `jsonQuery()`, `arrayContains()`

### Usage
```typescript
import { BaseService } from "@buildingai/base";
import { User } from "@buildingai/db/entities";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Repository } from "@buildingai/db/typeorm";

@Injectable()
export class UserService extends BaseService<User> {
    constructor(@InjectRepository(User) repository: Repository<User>) {
        super(repository);
    }
}
```

## BaseController

```typescript
import { BaseController } from "@buildingai/base";

@ConsoleController("users")
export class UserController extends BaseController {
    @Get()
    async list(@Query() paginationDto: PaginationDto) {
        const result = await this.userService.paginate(paginationDto);
        return this.paginationResult(result.items, result.total, paginationDto);
    }
}
```
