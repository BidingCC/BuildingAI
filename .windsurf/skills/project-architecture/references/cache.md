# @buildingai/cache

Caching utilities with Redis and memory cache.

## Location
`packages/@buildingai/cache/`

## Exports
- `CacheModule` - Memory cache module
- `CacheService` - Memory cache service
- `RedisModule` - Redis module
- `RedisService` - Redis service

## CacheService (Memory)

```typescript
import { CacheService } from "@buildingai/cache";

constructor(private cacheService: CacheService) {}

// Basic
await this.cacheService.set(key, value, 3600); // TTL in seconds
const value = await this.cacheService.get<T>(key);
await this.cacheService.del(key);

// Batch
await this.cacheService.mget<T>(keys);
await this.cacheService.mset(entries, ttl);
await this.cacheService.mdel(keys);

// Get or set
const value = await this.cacheService.getOrSet(
    key,
    async () => await fetchFromDb(),
    3600
);
```

## RedisService

```typescript
import { RedisService } from "@buildingai/cache";

constructor(private redisService: RedisService) {}

// Basic operations (same as CacheService)
await this.redisService.get<T>(key);
await this.redisService.set(key, value, ttl);

// Pub/Sub
await this.redisService.publish(channel, message);
await this.redisService.subscribe(channel, (msg) => {...});
```

## Pattern: Cache-Aside

```typescript
async getUser(id: string) {
    const key = `user:${id}`;
    const cached = await this.cacheService.get<User>(key);
    if (cached) return cached;
    
    const user = await this.userService.findOneById(id);
    await this.cacheService.set(key, user, 3600);
    return user;
}
```
