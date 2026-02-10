# @buildingai/extension-sdk

SDK for developing extensions.

## Location
`packages/@buildingai/extension-sdk/`

## Exports
- `AiPublicModule`, `PublicAiModelService` - AI services for extensions
- `ExtensionBillingModule`, `ExtensionBillingService` - Billing services
- `PublicUserService` - User service for extensions
- `defineBuildingAITsupConfig` - Build configuration

## Usage

```typescript
import {
    PublicAiModelService,
    ExtensionBillingService,
    PublicUserService,
} from "@buildingai/extension-sdk";

@Injectable()
export class ExtensionService {
    constructor(
        private aiModelService: PublicAiModelService,
        private billingService: ExtensionBillingService,
        private userService: PublicUserService,
    ) {}

    async useAI() {
        const models = await this.aiModelService.getModels();
    }

    async deductPower(options: ExtensionPowerDeductionOptions) {
        await this.billingService.deductPower(options);
    }
}
```
