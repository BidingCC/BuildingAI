# @buildingai/decorators

Custom decorators for controllers and parameters.

## Location
`packages/@buildingai/decorators/`

## Exports
- `@Playground()` - Get current user from request
- `@BuildFileUrl([...fields])` - Auto-build file URLs
- `@Public()` - Skip authentication
- `@SuperAdminOnly()` - Super admin only
- `@SkipTransform()` - Skip response transformation

## Usage

```typescript
import { Playground, BuildFileUrl, Public } from "@buildingai/decorators";

// Get current user
@Get("profile")
async getProfile(@Playground() user: User) {
    return user;
}

// Auto-build file URLs
@BuildFileUrl(["avatar", "user.avatar"])
@Get(":id")
async getPost(@Param("id") id: string) {
    return this.postService.findOneById(id);
}

// Public endpoint
@Public()
@Get("public")
async getPublic() {
    return { data: "public" };
}

// Super admin only
@SuperAdminOnly()
@Delete(":id")
async delete(@Param("id") id: string) {
    return this.service.delete(id);
}
```
