# @buildingai/dto

Shared data transfer objects.

## Location
`packages/@buildingai/dto/`

## Exports
- `PaginationDto` - Pagination parameters
- `IndexingSegmentsDto` - Indexing segments DTO

## Usage

```typescript
import { PaginationDto } from "@buildingai/dto";

export class QueryUserDto extends PaginationDto {
    @IsOptional()
    name?: string;
}

// In controller
@Get()
async list(@Query() query: QueryUserDto) {
    return this.userService.paginate(query);
}
```

## PaginationDto

```typescript
class PaginationDto {
    page?: number = 1;      // Page number (starts from 1)
    pageSize?: number = 15; // Items per page
}
```
