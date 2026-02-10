# @buildingai/ai-sdk

AI SDK packages for chat completions, embeddings, and provider integrations.

## Location
- `packages/@buildingai/ai-sdk/` - Legacy AI SDK
- `packages/@buildingai/ai-sdk-new/` - Vercel AI SDK 6.x based

## Exports (ai-sdk-new)

- `getProvider()` - Get AI provider
- `generateText()`, `streamText()` - Text generation
- `generateObject()` - Structured output
- `embed()` - Embeddings
- `generateSpeech()`, `generateTranscription()` - Speech
- `generateImage()` - Image generation
- `moderate()` - Content moderation
- `rerank()` - Document reranking

## Usage

```typescript
import { getProvider, generateText, streamText } from "@buildingai/ai-sdk-new";

// Text generation
const provider = getProvider("openai", { apiKey: "xxx" });
const result = await generateText({
    ...provider("gpt-4o"),
    prompt: "Hello!",
});

// Streaming
const stream = await streamText({
    ...provider("gpt-4o"),
    messages: [{ role: "user", content: "Tell a story" }],
});

for await (const chunk of stream.textStream) {
    process.stdout.write(chunk);
}

// Structured output
import { z } from "zod";
const result = await generateObject({
    ...provider("gpt-4o"),
    schema: z.object({ name: z.string(), age: z.number() }),
    prompt: "Generate user profile",
});
```

## Supported Providers

OpenAI, Anthropic, Google, DeepSeek, Moonshot, Tongyi, Wenxin, ZhipuAI, Hunyuan, VolcEngine, SiliconFlow, X, Ollama, etc.
