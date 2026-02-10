# @buildingai/ai-sdk

基于 [Vercel AI SDK 6.x](https://ai-sdk.dev/) 的统一 AI SDK，支持多种 AI 能力和多个 Provider。

## 特性

- 🚀 **完整 AI SDK 6.x 功能** - 包含 Agent、Chat、Streaming、Object Generation 等
- 🔌 **多 Provider 支持** - OpenAI、Anthropic、Google、DeepSeek、智谱 AI 等
- 🎯 **统一 API** - 一套代码，切换 Provider 只需改一行
- 📦 **扩展功能** - TTS、STT、图像生成、内容审核、文档重排序
- 🛡️ **类型安全** - 完整的 TypeScript 类型支持
- ⚡ **能力检测** - 自动检测 Provider 支持的功能

## 安装

```bash
pnpm add @buildingai/ai-sdk
```

## 快速开始

### 基础用法

```typescript
import { generateText, getProvider } from "@buildingai/ai-sdk";

// 创建 Provider
const provider = getProvider("openai", {
    apiKey: process.env.OPENAI_API_KEY,
});

// 文本生成（展开语法）
const result = await generateText({
    ...provider("gpt-4o"),
    prompt: "Hello, how are you?",
});

console.log(result.text);
```

### 流式对话

```typescript
import { streamText, getProvider } from "@buildingai/ai-sdk";

const provider = getProvider("openai", { apiKey: "xxx" });

const stream = await streamText({
    ...provider("gpt-4o"),
    messages: [{ role: "user", content: "Tell me a story about a robot." }],
});

for await (const chunk of stream.textStream) {
    process.stdout.write(chunk);
}
```

### 结构化输出

```typescript
import { generateObject, getProvider } from "@buildingai/ai-sdk";
import { z } from "zod";

const provider = getProvider("openai", { apiKey: "xxx" });

const result = await generateObject({
    ...provider("gpt-4o"),
    schema: z.object({
        name: z.string(),
        age: z.number(),
        email: z.string().email(),
    }),
    prompt: "Generate a random user profile.",
});

console.log(result.object);
```

## Provider 用法

### 使用 getProvider（推荐）

```typescript
import { getProvider, generateText, embed } from "@buildingai/ai-sdk";

const provider = getProvider("openai", { apiKey: "xxx" });

// 文本生成
const text = await generateText({
    ...provider("gpt-4o"),
    prompt: "Hello!",
});

// 向量嵌入（自动识别）
const embedding = await embed({
    ...provider("text-embedding-3-small"),
    value: "Hello!",
});
```

### 使用专门函数（类型更精确）

```typescript
import {
    getProviderForText,
    getProviderForEmbedding,
    getProviderForSpeech,
    generateText,
    embed,
    generateSpeech,
} from "@buildingai/ai-sdk";

// 文本生成
const textProvider = getProviderForText("openai", { apiKey: "xxx" });
const text = await generateText({
    ...textProvider("gpt-4o"),
    prompt: "Hello!",
});

// 向量嵌入
const embeddingProvider = getProviderForEmbedding("openai", { apiKey: "xxx" });
const embedding = await embed({
    ...embeddingProvider("text-embedding-3-small"),
    value: "Hello!",
});

// 语音合成
const speechProvider = getProviderForSpeech("openai", { apiKey: "xxx" });
const speech = await generateSpeech({
    ...speechProvider("tts-1"),
    text: "Hello, world!",
    voice: "alloy",
});
```

### 能力检测

```typescript
import { getProvider, generateSpeech } from "@buildingai/ai-sdk";

const provider = getProvider("openai", { apiKey: "xxx" });

// 检测单个能力
if (provider.supports("speech")) {
    const speech = await generateSpeech({
        ...provider.speech("tts-1"),
        text: "Hello!",
    });
}

// 获取所有能力
const capabilities = provider.capabilities.getAll();
console.log(capabilities);
// { language: true, embedding: true, speech: true, transcription: true, ... }
```

## 支持的 Providers

| Provider  | 标识符        | 说明                                |
| --------- | ------------- | ----------------------------------- |
| OpenAI    | `openai`      | GPT-4o, GPT-4, TTS, Whisper, DALL-E |
| Anthropic | `anthropic`   | Claude 系列                         |
| Google    | `google`      | Gemini 系列                         |
| DeepSeek  | `deepseek`    | DeepSeek Chat/Coder                 |
| 智谱 AI   | `zhipuai`     | GLM 系列                            |
| 月之暗面  | `moonshot`    | Kimi 系列                           |
| 通义千问  | `tongyi`      | 阿里云通义千问                      |
| 混元      | `hunyuan`     | 腾讯混元                            |
| 火山引擎  | `volcengine`  | 豆包系列                            |
| 硅基流动  | `siliconflow` | 多模型聚合                          |
| Ollama    | `ollama`      | 本地模型                            |
| 自定义    | `custom`      | 任意 OpenAI 兼容 API                |

## 自定义功能

### 语音合成 (TTS)

```typescript
import { generateSpeech, getProvider } from "@buildingai/ai-sdk";

const provider = getProvider("openai", { apiKey: "xxx" });

const result = await generateSpeech({
    ...provider.speech("tts-1"),
    text: "Hello, world!",
    voice: "alloy",
    speed: 1.0,
    responseFormat: "mp3",
});

// 保存音频
fs.writeFileSync("output.mp3", Buffer.from(result.audio));
```

### 语音识别 (STT)

```typescript
import { generateTranscription, getProvider } from "@buildingai/ai-sdk";

const provider = getProvider("openai", { apiKey: "xxx" });

const result = await generateTranscription({
    ...provider.transcription("whisper-1"),
    audio: fs.readFileSync("audio.mp3"),
    language: "zh",
});

console.log(result.text);
```

### 图像生成

```typescript
import { generateImage, getProvider } from "@buildingai/ai-sdk";

const provider = getProvider("openai", { apiKey: "xxx" });

const result = await generateImage({
    ...provider.image("dall-e-3"),
    prompt: "A beautiful sunset over mountains",
    size: "1024x1024",
    quality: "hd",
});

console.log("Image URL:", result.images[0].url);
```

### 内容审核

```typescript
import { moderate, getProvider } from "@buildingai/ai-sdk";

const provider = getProvider("openai", { apiKey: "xxx" });

const result = await moderate({
    ...provider.moderation("text-moderation-stable"),
    input: "Some text to check",
});

console.log("Flagged:", result.results[0].flagged);
```

### 文档重排序

```typescript
import { rerankV3, getProvider } from "@buildingai/ai-sdk";

const provider = getProvider("zhipuai", { apiKey: "xxx" });

const result = await rerankV3({
    ...provider.rerank("rerank-1"),
    query: "AI technology trends",
    documents: [
        "Machine learning is a subset of AI",
        "Deep learning uses neural networks",
        "Natural language processing enables text understanding",
    ],
    topN: 2,
});

result.ranking.forEach((item) => {
    console.log(`Index: ${item.index}, Score: ${item.relevanceScore}`);
});
```

## 错误处理

```typescript
import {
    getProvider,
    generateText,
    isProviderCapabilityError,
    isAPIError,
    isRateLimitError,
} from "@buildingai/ai-sdk";

try {
    const provider = getProvider("openai", { apiKey: "xxx" });
    const result = await generateText({
        ...provider("gpt-4o"),
        prompt: "Hello!",
    });
} catch (error) {
    if (isProviderCapabilityError(error)) {
        console.error(`Provider doesn't support: ${error.capability}`);
    } else if (isRateLimitError(error)) {
        console.error(`Rate limited, retry after: ${error.retryAfter}ms`);
    } else if (isAPIError(error)) {
        console.error(`API error: ${error.statusCode} - ${error.message}`);
    } else {
        throw error;
    }
}
```

## Agent 功能

```typescript
import { generateText, getProvider, tool } from "@buildingai/ai-sdk";
import { z } from "zod";

const provider = getProvider("openai", { apiKey: "xxx" });

const result = await generateText({
    ...provider("gpt-4o"),
    prompt: "What is the weather in Tokyo?",
    tools: {
        getWeather: tool({
            description: "Get weather for a location",
            parameters: z.object({
                location: z.string().describe("City name"),
            }),
            execute: async ({ location }) => {
                return { temperature: 22, condition: "sunny" };
            },
        }),
    },
    maxSteps: 5,
});

console.log(result.text);
```

## API 参考

### 核心函数

| 函数             | 说明           |
| ---------------- | -------------- |
| `generateText`   | 生成文本       |
| `streamText`     | 流式生成文本   |
| `generateObject` | 生成结构化对象 |
| `streamObject`   | 流式生成对象   |
| `embed`          | 文本向量化     |
| `embedMany`      | 批量向量化     |
| `tool`           | 定义工具       |

### 自定义函数

| 函数                    | 说明                    |
| ----------------------- | ----------------------- |
| `generateSpeech`        | 语音合成                |
| `generateTranscription` | 语音识别                |
| `generateImage`         | 图像生成                |
| `moderate`              | 内容审核                |
| `rerank`                | 文档重排序（自定义 V1） |
| `rerankV3`              | 文档重排序（AI SDK V3） |

### Provider 函数

| 函数                          | 说明                  |
| ----------------------------- | --------------------- |
| `getProvider`                 | 获取通用 Provider     |
| `getProviderForText`          | 获取文本生成 Provider |
| `getProviderForEmbedding`     | 获取嵌入 Provider     |
| `getProviderForSpeech`        | 获取语音合成 Provider |
| `getProviderForTranscription` | 获取语音识别 Provider |
| `getProviderForImage`         | 获取图像生成 Provider |
| `getProviderForModeration`    | 获取内容审核 Provider |
| `getProviderForRerank`        | 获取重排序 Provider   |

## License

MIT
