# @buildingai/logger

Logging utilities.

## Location
`packages/@buildingai/logger/`

## Exports
- `TerminalLogger` - Terminal-based logger

## Usage

```typescript
import { TerminalLogger } from "@buildingai/logger";

const logger = new TerminalLogger();
logger.log("Message");
logger.error("Error", error);
logger.warn("Warning");
```
