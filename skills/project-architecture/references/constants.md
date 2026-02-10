# @buildingai/constants

Shared constants and enums.

## Location
`packages/@buildingai/constants/`

## Exports
- `BusinessCode` - Business error codes
- `ACCOUNT_LOG_*` - Account log constants
- `DATASETS_*` - Dataset constants
- `DICT_*` - Dictionary constants
- `EXTENSION_*` - Extension constants
- `PAYCONFIG_*` - Payment config constants
- `STATUS_CODES` - Status code constants
- `TAG_*` - Tag constants
- `TEAM_ROLE_*` - Team role constants
- `TERMINAL_*` - Terminal constants
- Web constants: `AUTH_*`, `ROUTES_*`, `STORAGE_*`

## Usage

```typescript
import { BusinessCode } from "@buildingai/constants/shared/business-code.constant";
import { ACCOUNT_LOG_TYPE_DESCRIPTION } from "@buildingai/constants/shared/account-log.constants";

throw HttpErrorFactory.business("Error", BusinessCode.EMAIL_EXISTS);
```
