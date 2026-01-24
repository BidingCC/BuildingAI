# packages/core

Reusable business logic modules.

## Location
`packages/core/`

## Exports

- `BillingModule`, `BillingService` - Billing logic
- `ExtensionModule`, extension utilities - Extension management
- `QueueModule` - Queue utilities
- `SecretModule`, `SecretService` - Secret management
- `UploadModule`, `FileStorageService`, `FileUploadService` - File upload

## Usage

```typescript
import {
    BillingModule,
    SecretModule,
    UploadModule,
} from "@buildingai/core/modules";

@Module({
    imports: [BillingModule, SecretModule, UploadModule],
})
export class AppModule {}
```

## File Upload

```typescript
import { FileStorageService } from "@buildingai/core/modules";

constructor(private fileStorage: FileStorageService) {}

async uploadFile(file: Express.Multer.File) {
    const result = await this.fileStorage.upload(file);
    return result.url; // File URL
}
```

## Extension Decorators

```typescript
import {
    ExtensionConsoleController,
    ExtensionWebController,
    ExtensionEntity,
} from "@buildingai/core/decorators";

@ExtensionConsoleController("my-extension", "My Extension")
export class ExtensionController {}

@ExtensionEntity()
export class ExtensionEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;
}
```
