# @buildingai/errors

Error handling utilities.

## Location
`packages/@buildingai/errors/`

## Exports
- `HttpErrorFactory` - Error factory methods
- `HttpError` - Base error class
- `HttpStatus` - Status code constants

## HttpErrorFactory

```typescript
import { HttpErrorFactory } from "@buildingai/errors";

// Standard errors
throw HttpErrorFactory.notFound("User not found");
throw HttpErrorFactory.paramError("Invalid ID");
throw HttpErrorFactory.unauthorized("Auth required");
throw HttpErrorFactory.forbidden("No permission");
throw HttpErrorFactory.badRequest("Invalid input");

// Business error with code
throw HttpErrorFactory.business("Email exists", "EMAIL_EXISTS");
```

## Common Pattern

```typescript
const user = await this.userService.findOneById(id);
if (!user) {
    throw HttpErrorFactory.notFound(`User ${id} not found`);
}
```
