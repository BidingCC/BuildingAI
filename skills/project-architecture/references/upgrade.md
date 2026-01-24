# @buildingai/upgrade

Version upgrade scripts for database migrations and data transformations.

## Location
`packages/@buildingai/upgrade/`

## Exports
- `BaseUpgradeScript` - Base class for upgrade scripts
- Version-specific upgrade scripts in `src/scripts/{version}/`

## Usage

Upgrade scripts are automatically executed during system upgrade. Create version-specific scripts:

```typescript
import { BaseUpgradeScript, UpgradeContext } from "@buildingai/upgrade";

export class Upgrade extends BaseUpgradeScript {
    readonly version = "25.1.0";

    async execute(context: UpgradeContext): Promise<void> {
        const { dataSource } = context;
        
        // Run SQL
        await dataSource.query(`UPDATE users SET ...`);
        
        // Custom logic
        await this.updateData(context);
    }
}
```

Scripts are located in `src/scripts/{version}/index.ts`.
