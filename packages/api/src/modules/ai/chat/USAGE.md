# AI 对话 API 使用文档

完全基于 **AI SDK (Vercel AI SDK)** 标准实现，前后端完全兼容。

## 后端实现

### 核心特性

- ✅ **完全使用 AI SDK 标准** - 使用 `streamText` / `generateText`
- ✅ **标准 SSE 流格式** - 使用 `pipeUIMessageStreamToResponse`
- ✅ **兼容 `@ai-sdk/react` useChat** - 前端可直接使用
- ✅ **支持停止请求** - 通过 `AbortController`
- ✅ **支持续流** - 继续之前中断的对话

### API 端点

#### 1. 流式对话 (兼容 useChat)

```typescript
POST /api/ai-chat
```

**请求体格式** (AI SDK 标准):

```json
{
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "parts": [{ "type": "text", "text": "你好" }]
    }
  ],
  "data": {
    "modelId": "uuid-of-model",
    "conversationId": "optional-uuid",
    "title": "可选标题",
    "systemPrompt": "可选系统提示词",
    "mcpServers": ["可选-mcp-服务器-id"]
  }
}
```

**响应**: SSE 流 (AI SDK 标准格式)

#### 2. 非流式对话

```typescript
POST /api/ai-chat/generate
```

**请求体**: 同上

**响应**:

```json
{
  "conversationId": "uuid",
  "messageId": "uuid",
  "content": "AI回复内容",
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 50,
    "total_tokens": 150
  },
  "finish_reason": "stop",
  "consumed_power": 10,
  "processing_time": 1234
}
```

#### 3. 续流接口

```typescript
POST /api/ai-chat/continue
```

**请求体**:

```json
{
  "conversationId": "uuid"
}
```

**响应**: SSE 流 (继续之前的对话)

---

## 前端使用

### 安装依赖

```bash
npm install @ai-sdk/react
# 或
pnpm add @ai-sdk/react
```

### 基础用法

```tsx
import { useChat } from '@ai-sdk/react';

function ChatComponent() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat({
    api: '/api/ai-chat', // 后端接口地址
    body: {
      // 通过 data 传递额外参数
      data: {
        modelId: 'your-model-id', // 必填
        conversationId: 'optional-conversation-id', // 可选
        title: '对话标题', // 可选
        systemPrompt: '你是一个专业的助手', // 可选
      },
    },
    headers: {
      // 如果需要认证，添加 token
      Authorization: `Bearer ${token}`,
    },
  });

  return (
    <div>
      <div>
        {messages.map((message) => (
          <div key={message.id}>
            <strong>{message.role}:</strong>
            {message.parts
              .filter((part) => part.type === 'text')
              .map((part, i) => (
                <span key={i}>{(part as { text: string }).text}</span>
              ))}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="输入消息..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          发送
        </button>
        {isLoading && (
          <button type="button" onClick={stop}>
            停止
          </button>
        )}
      </form>
    </div>
  );
}
```

### 停止请求

`useChat` 自动支持停止功能，调用 `stop()` 即可：

```tsx
const { stop, isLoading } = useChat({ ... });

// 停止当前请求
if (isLoading) {
  stop();
}
```

### 续流功能

如果需要续流（继续之前的对话），可以：

1. **方式一**: 在 `useChat` 中传递 `conversationId`

```tsx
const { messages } = useChat({
  api: '/api/ai-chat',
  body: {
    data: {
      modelId: 'model-id',
      conversationId: 'existing-conversation-id', // 传递已有对话ID
    },
  },
});
```

2. **方式二**: 调用续流接口

```tsx
async function continueChat(conversationId: string) {
  const response = await fetch('/api/ai-chat/continue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ conversationId }),
  });

  // 处理 SSE 流
  const reader = response.body?.getReader();
  // ... 处理流数据
}
```

### 完整示例

```tsx
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

function AdvancedChat() {
  const [modelId, setModelId] = useState('default-model-id');
  const [conversationId, setConversationId] = useState<string | undefined>();

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop, error } = useChat({
    api: '/api/ai-chat',
    body: {
      data: {
        modelId,
        conversationId,
        systemPrompt: '你是一个专业的AI助手',
      },
    },
    onFinish: (message) => {
      // 对话完成后的回调
      console.log('对话完成:', message);
      // 如果创建了新对话，保存 conversationId
      if (!conversationId && message.id) {
        // 从响应中获取 conversationId (需要后端返回)
        // setConversationId(newConversationId);
      }
    },
    onError: (error) => {
      console.error('对话错误:', error);
    },
  });

  return (
    <div>
      <div>
        <label>
          选择模型:
          <select value={modelId} onChange={(e) => setModelId(e.target.value)}>
            <option value="model-1">模型 1</option>
            <option value="model-2">模型 2</option>
          </select>
        </label>
      </div>

      <div className="messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <strong>{message.role}:</strong>
            <div>
              {message.parts.map((part, i) => {
                if (part.type === 'text') {
                  return <span key={i}>{(part as { text: string }).text}</span>;
                }
                return null;
              })}
            </div>
          </div>
        ))}
      </div>

      {error && <div className="error">错误: {error.message}</div>}

      <form onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder="输入消息..."
          disabled={isLoading}
          rows={4}
        />
        <div>
          <button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? '发送中...' : '发送'}
          </button>
          {isLoading && (
            <button type="button" onClick={stop}>
              停止
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
```

---

## 关键点

### 1. 消息格式

AI SDK 使用 `UIMessage` 格式：

```typescript
interface UIMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  parts: Array<UIMessagePart>; // 不是 content 字段！
  metadata?: unknown;
}
```

**注意**: `UIMessage` 使用 `parts` 数组，不是 `content` 字符串！

### 2. Token 使用量

AI SDK v6 使用:
- `inputTokens` (不是 `promptTokens`)
- `outputTokens` (不是 `completionTokens`)
- `totalTokens`

后端会自动转换为内部格式。

### 3. 停止请求

- 前端: 调用 `stop()` 方法
- 后端: 自动监听客户端断开，取消 `AbortController`

### 4. 续流

- 传递 `conversationId` 继续已有对话
- 或调用 `/api/ai-chat/continue` 接口

---

## 类型定义

所有类型都从 `ai` 包导入：

```typescript
import type { UIMessage, ModelMessage, FinishReason, LanguageModelUsage } from 'ai';
```

---

## 参考文档

- [AI SDK 官方文档](https://sdk.vercel.ai/docs)
- [useChat Hook 文档](https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat)
- [StreamText 文档](https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-text)
