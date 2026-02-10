# @buildingai/di

Dependency injection utilities.

## Location
`packages/@buildingai/di/`

## Exports
- `Container`, `Service` - DI container and service decorator
- `getGlobalContainer()`, `setGlobalContainer()` - Global container management
- `getService()` - Get service from container
- `NestContainer` - NestJS container integration

## Usage

```typescript
import { Container, Service, getService } from "@buildingai/di";

@Service()
class MyService {
    doSomething() {}
}

const container = new Container();
container.register(MyService);
const service = container.get(MyService);

// Or use global container
setGlobalContainer(container);
const service = getService(MyService);
```
