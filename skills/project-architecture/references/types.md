# @buildingai/types

TypeScript type definitions.

## Location
`packages/@buildingai/types/`

## Exports
- AI types: `ChatMessage`, `AgentReferenceSources`, `TokenUsage`, `MessageMetadata`, `AIRawResponse`, `RetrievalConfig`
- HTTP types: `HttpChatMessage`, `ChatStreamConfig`, `ChatStreamChunk`, `HttpClient`, `SSEConfig`
- Analyse types: `AnalyseTokenUsage`, `Dashboard` interfaces

## Usage

```typescript
import type {
    ChatMessage,
    TokenUsage,
    AgentReferenceSources,
} from "@buildingai/types";

import type {
    HttpChatMessage,
    ChatStreamConfig,
} from "@buildingai/types";
```
