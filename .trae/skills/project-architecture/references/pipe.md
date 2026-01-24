# @buildingai/pipe

Validation pipes.

## Location
`packages/@buildingai/pipe/`

## Exports
- `UUIDValidationPipe` - UUID parameter validation

## Usage

```typescript
import { UUIDValidationPipe } from "@buildingai/pipe";

@Get(":id")
async getById(@Param("id", UUIDValidationPipe) id: string) {
    // id is guaranteed to be a valid UUID
    return this.service.findOneById(id);
}
```
