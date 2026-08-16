# Coze 新版 API 迁移规划文档

## 一、背景

Coze 官方推出了全新的 API 协议（`stream_run`），与现有旧版 API（`/v3/chat`、`/v1/chat`）完全不同。当前项目仍在使用旧版 API，需要升级以支持新版 API。

### 新旧 API 核心差异

| 维度 | 旧版 API (`/v3/chat`) | 新版 API (`/stream_run`) |
|---|---|---|
| **端点** | `https://api.coze.cn/v3/chat` | `https://<your_domain>/stream_run` |
| **鉴权** | `Authorization: Bearer <API_KEY>` | `Authorization: Bearer <API_TOKEN>`（个人访问令牌） |
| **标识符** | `bot_id`（字符串） | `project_id`（整数） |
| **会话管理** | `conversation_id` + `auto_save_history` | `session_id`（由调用方自定义） |
| **消息格式** | `additional_messages: [{role, type, content, content_type}]` | `content.query.prompt: [{type: "text", content: {text: "..."}}]` |
| **用户标识** | `user_id` | 无需 |
| **请求体结构** | `{bot_id, user_id, conversation_id, stream, auto_save_history, additional_messages}` | `{type, session_id, project_id, content: {query: {prompt}}}` |
| **SSE 事件类型** | `message.delta`, `message.completed`, `conversation.message.delta` 等 | `message_start`, `answer`, `tool_request`, `tool_response`, `message_end`, `error` |
| **文本提取路径** | `data.message.content` / `data.content` / `data.delta` | `data.content.answer`（按 `sequence_id` 拼接） |
| **Token 统计路径** | `data.chat.usage` / `data.usage` | `data.content.message_end.token_cost` |
| **工具调用** | `dynamic-tool` 事件（`input-available`/`output-available`/`output-error`） | `tool_request` / `tool_response` 事件 |

---

## 二、影响范围分析

### 2.1 前端（需修改 1 个文件）

| 文件 | 当前状态 | 需要修改 |
|---|---|---|
| `packages/client/src/pages/agents/detail/_components/configuration/function/third-party-integration.tsx` | Bot ID 输入框 + 扩展配置 JSON 输入框 | 修改 UI 为：**Project ID** 输入框（替换 Bot ID）+ **API Token** 输入框 + **Domain** 输入框（替换 Base URL）+ API 版本选择开关 |

### 2.2 后端（需修改 5 个文件）

| 文件 | 当前状态 | 需要修改 |
|---|---|---|
| `packages/@buildingai/types/src/ai/agent-config.interface.ts` | `ThirdPartyIntegrationConfig` 使用 `appId`/`apiKey`/`baseURL` | **新增** `apiVersion` 字段区分新旧版，保持向后兼容 |
| `packages/api/src/modules/ai/agents/integrations/coze-api.service.ts` | 仅支持旧版 `/v3/chat` API | **新增** `streamChatV2()` 方法调用新版 `stream_run`，**新增** SSE 解析方法处理新版事件格式 |
| `packages/api/src/modules/ai/agents/providers/coze-chat.provider.ts` | 仅调用旧版 `streamChat()` | 根据 `apiVersion` 路由到旧版或新版方法 |
| `packages/api/src/modules/ai/agents/integrations/coze-agent-sync.service.ts` | 使用旧版 `getBotInfo()` 同步智能体信息 | 新版 API 可能不再提供 Bot 信息接口，需根据 `apiVersion` 跳过或使用新接口 |
| `packages/api/src/modules/ai/agents/services/agent-chat-completion.service.ts` | 路由逻辑无变化 | 无需修改（CozeChatProvider 内部处理） |

---

## 三、详细改造方案

### 3.1 类型定义层（`agent-config.interface.ts`）

**新增字段**（`ThirdPartyIntegrationConfig` 接口）：

```typescript
export interface ThirdPartyIntegrationConfig {
    provider?: "coze" | "dify";
    appId?: string;                    // 旧版：bot_id；新版：project_id
    apiKey?: string;                   // 旧版：API Key；新版：API Token
    baseURL?: string;                  // 旧版：https://api.coze.cn；新版：部署域名
    extendedConfig?: Record<string, any>;
    variableMapping?: Record<string, string>;
    useExternalConversation?: boolean;
    
    // ⭐ 新增字段
    apiVersion?: "v1" | "v2";         // "v1"=旧版, "v2"=新版（stream_run），默认 "v1"
    projectId?: string;               // 新版专用：Coze 项目 ID（整数，但存储为字符串）
}
```

### 3.2 前端改造（`third-party-integration.tsx`）

**改造内容：**

1. **新增"API 版本"切换开关**（Toggle / Segmented Control）
   - 标签：`API 版本`
   - 选项：`旧版 (v1/v3 chat)` | `新版 (stream_run)`
   - 默认：`旧版`

2. **根据版本切换显示不同的输入框：**

   | 字段 | 旧版 (v1) | 新版 (v2) |
   |---|---|---|
   | 平台地址 | `BASE URL`（默认 `https://api.coze.cn`） | `Domain`（如 `xxx.coze.cn`，即部署域名） |
   | 标识符 | `Bot ID *`（字符串） | `Project ID *`（数字） |
   | 密钥 | `API Key *` | `API Token *`（个人访问令牌，`pat_` 开头） |
   | 会话管理 | `使用平台会话管理` Switch | 同左（新版也用 `session_id`） |

3. **移除"扩展配置 (新版 API JSON)"Textarea**
   - 因为 `project_id` 已作为独立输入框，不再需要通过 JSON 注入

4. **数据流变化：**
   - 旧版：`appId` → `bot_id`，`apiKey` → API Key，`baseURL` → Coze 域名
   - 新版：`appId` → `project_id`（存为字符串），`apiKey` → API Token，`baseURL` → 部署域名（不含 `/stream_run` 路径）

### 3.3 后端 - CozeApiService 改造

#### 3.3.1 新增方法：`streamChatV2()`

```typescript
/**
 * 发起 Coze 新版 API (stream_run) 流式聊天请求。
 */
async streamChatV2(params: CozeStreamChatParams): Promise<Response> {
    const normalized = this.normalizeConfig(params.config);
    const apiToken = normalized.apiKey?.trim();
    const projectId = this.resolveProjectId(normalized);  // 从 appId 或 extendedConfig.projectId 获取
    const baseUrl = this.resolveBaseUrl(normalized);       // 新版使用部署域名

    if (!apiToken) throw HttpErrorFactory.badRequest("Coze API Token 未配置");
    if (!projectId) throw HttpErrorFactory.badRequest("Coze Project ID 未配置");

    // 构建新版请求体
    const prompt: Array<{type: string; content: Record<string, any>}> = [];
    
    // 添加当前用户消息
    prompt.push({
        type: "text",
        content: { text: params.message }
    });

    // 新版不支持 additional_messages，历史消息通过 session_id 管理
    // 首次请求时生成 session_id，后续携带

    const body = {
        type: "query",
        session_id: params.conversationId || this.generateSessionId(),
        project_id: Number(projectId),
        content: {
            query: { prompt }
        }
    };

    const url = `${baseUrl}/stream_run`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text();
        throw HttpErrorFactory.badRequest(`Coze 新版 API 调用失败: ${text || response.status}`);
    }

    return response;
}
```

#### 3.3.2 新增方法：`parseStreamEventV2()`

新版 SSE 事件格式与旧版不同，需要新的解析方法：

```typescript
/**
 * 解析新版 stream_run SSE 事件
 */
parseStreamEventV2(rawLine: string): {
    type?: string;           // message_start | answer | tool_request | tool_response | message_end | error
    data?: Record<string, any>;
    rawData?: string;
}
```

#### 3.3.3 新增方法：`extractAnswerTextV2()`

从新版 `answer` 事件提取文本：

```typescript
/**
 * 从新版 answer 事件提取文本片段
 */
extractAnswerTextV2(data?: Record<string, any>): {
    text: string;
    sequenceId: number;
    finish: boolean;
}
```

#### 3.3.4 新增方法：`extractUsageV2()`

从 `message_end` 事件提取 token 用量：

```typescript
/**
 * 从新版 message_end 事件提取 token 用量
 */
extractUsageV2(data?: Record<string, any>): CozeChatUsage | undefined {
    const messageEnd = data?.content?.message_end;
    if (!messageEnd) return undefined;
    return {
        inputTokens: messageEnd.token_cost?.input_tokens,
        outputTokens: messageEnd.token_cost?.output_tokens,
        totalTokens: messageEnd.token_cost?.total_tokens,
    };
}
```

#### 3.3.5 新增方法：`extractToolCallV2()`

从 `tool_request` / `tool_response` 事件提取工具调用：

```typescript
/**
 * 从新版 tool_request / tool_response 事件提取工具调用
 */
extractToolCallV2(data?: Record<string, any>): CozeToolCallPart | undefined {
    // tool_request: { content: { tool_request: {...} } }
    // tool_response: { content: { tool_response: {...} } }
}
```

#### 3.3.6 修改 `normalizeConfig()`

增加对 `apiVersion` 和 `projectId` 的处理：

```typescript
normalizeConfig(config?: ThirdPartyIntegrationConfig | null): ThirdPartyIntegrationConfig {
    // ... 现有逻辑 ...
    
    // 新增：检测 API 版本
    const apiVersion = config?.apiVersion || "v1";
    normalized.apiVersion = apiVersion;
    
    // 新版 API：projectId 可能从 appId 或 extendedConfig.projectId 获取
    if (apiVersion === "v2") {
        const projectId = config?.projectId || config?.appId;
        if (projectId) {
            extendedConfig.projectId = projectId;
        }
    }
    
    // ... 现有逻辑 ...
}
```

#### 3.3.7 新增 `resolveProjectId()`

```typescript
resolveProjectId(config?: ThirdPartyIntegrationConfig | null): string | undefined {
    return (
        config?.projectId?.trim() ||
        (config?.extendedConfig?.projectId as string)?.trim() ||
        config?.appId?.trim()
    ) || undefined;
}
```

### 3.4 后端 - CozeChatProvider 改造

**核心改动：** 在 `streamChat()` 方法中根据 `apiVersion` 分流：

```typescript
async streamChat(agent: Agent, params: AgentChatCompletionParams, response: ServerResponse) {
    const apiVersion = agent.thirdPartyIntegration?.apiVersion || "v1";
    
    if (apiVersion === "v2") {
        await this.streamChatV2(agent, params, response);
    } else {
        await this.streamChatV1(agent, params, response);  // 现有逻辑
    }
}
```

**新增 `streamChatV2()` 方法：**

```typescript
private async streamChatV2(agent: Agent, params: AgentChatCompletionParams, response: ServerResponse) {
    // 1. 创建本地会话
    // 2. 生成 session_id（或复用已有）
    // 3. 调用 cozeApiService.streamChatV2()
    // 4. 逐行解析 SSE（不同于旧版的逐块解析）
    // 5. 处理 answer 事件 → text-delta
    // 6. 处理 tool_request / tool_response → tool-input-available / tool-output-available
    // 7. 处理 message_end → text-end + 用量统计
    // 8. 保存消息 + 扣费
}
```

**关键差异：**
- 旧版：按 `\n\n` 分割事件块（SSE 标准）
- 新版：按行读取，每行 `data:` 开头的是一条事件
- 旧版：文本来自 `message.delta` 事件
- 新版：文本来自 `answer` 事件（`content.answer`），需按 `sequence_id` 排序拼接

### 3.5 后端 - CozeAgentSyncService 改造

**问题：** 新版 API 可能不再提供 `/v1/bots/retrieve` 等 Bot 信息接口。

**方案：**
- 当 `apiVersion === "v2"` 时，跳过 `getBotInfo()` 同步
- 设置 `cozeSyncStatus: "skipped_v2"` 并提示用户手动填写智能体信息
- 或者：Coze 新版如果有对应的项目信息接口，后续再对接

```typescript
async syncAgentInfo(agentId: string): Promise<CozeAgentSyncResult> {
    // ...
    const apiVersion = agent.thirdPartyIntegration?.apiVersion || "v1";
    
    if (apiVersion === "v2") {
        // 新版 API 暂不支持同步 Bot 信息
        return {
            agent,
            status: "skipped",
            errorMessage: "新版 API (stream_run) 暂不支持自动同步智能体信息，请手动配置",
        };
    }
    
    // ... 现有旧版同步逻辑 ...
}
```

---

## 四、SSE 事件解析对比

### 旧版 SSE 事件格式
```
event: conversation.message.delta
data: {"id":"...","conversation_id":"...","bot_id":"...","type":"answer","content":"你好"}

event: conversation.message.completed
data: {"id":"...","conversation_id":"...","bot_id":"...","type":"answer","content":"你好，我是..."}

event: conversation.chat.completed
data: {"id":"...","conversation_id":"...","bot_id":"...","chat_id":"...","usage":{...}}
```

### 新版 SSE 事件格式
```
data: {"type":"message_start","content":{"message_start":{...}}}

data: {"type":"answer","sequence_id":1,"content":{"answer":"你好"},"finish":false}

data: {"type":"answer","sequence_id":2,"content":{"answer":"，我是AI助手"},"finish":false}

data: {"type":"answer","sequence_id":3,"content":{"answer":""},"finish":true}

data: {"type":"message_end","content":{"message_end":{"code":"0","token_cost":{...},"time_cost_ms":1234}}}
```

---

## 五、实施步骤

### Phase 1：类型定义 + 后端核心（预计 2-3 小时）
1. 修改 `agent-config.interface.ts` — 新增 `apiVersion`、`projectId` 字段
2. 修改 `coze-api.service.ts` — 新增 `streamChatV2()`、`parseStreamEventV2()`、`extractAnswerTextV2()` 等方法
3. 修改 `coze-chat.provider.ts` — 新增 `streamChatV2()` 分流逻辑

### Phase 2：后端同步服务 + 测试（预计 1-2 小时）
4. 修改 `coze-agent-sync.service.ts` — 新版跳过同步
5. 单元测试 + 联调测试新版 API

### Phase 3：前端改造（预计 1-2 小时）
6. 修改 `third-party-integration.tsx` — API 版本切换 UI + 新版输入框

### Phase 4：集成测试 + 文档（预计 1 小时）
7. 端到端测试新旧两版 API 共存
8. 更新用户文档

---

## 六、向后兼容策略

1. **默认 `apiVersion = "v1"`**：不填写时走旧版逻辑，确保现有用户不受影响
2. **新旧代码共存**：`CozeApiService` 中 `streamChat()` 保留不动，新增 `streamChatV2()`
3. **`extendedConfig` 兼容**：新版配置的 `project_id` 也会写入 `extendedConfig`，与旧版格式兼容
4. **前端渐进切换**：通过 Toggle 切换新旧版，用户手动升级

---

## 七、风险点 & 待确认事项

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| 新版 API 不支持文件上传（`upload_file` type） | 文件消息需特殊处理 | Phase 1 先实现文本对话，文件上传后续迭代 |
| 新版 `session_id` 机制与旧版 `conversation_id` 映射不同 | 会话恢复逻辑需适配 | 复用现有 `metadata.cozeConversationId` 存储 `session_id` |
| 新版 API Token（`pat_` 开头）与旧版 API Key 格式不同 | 用户可能混淆 | 前端根据版本切换 label 和 placeholder 提示 |
| 新版可能不支持获取 Bot 信息 | 同步功能降级 | 提示用户手动填写名称、描述等信息 |
| Base URL 格式变化（从 `api.coze.cn` 到自定义域名） | URL 校验逻辑需调整 | 新版 `baseURL` 允许任意域名格式 |

---

## 八、总结

本次改造的核心思路是**新旧共存、渐进升级**：

- **旧版用户不受影响**（默认 `apiVersion = "v1"`）
- **新版用户通过前端 Toggle 切换**（选择 `v2` 后显示 Project ID + Domain + API Token）
- **后端通过 `apiVersion` 分流到不同的处理方法**
- **同步服务对新版降级处理**（跳过 Bot 信息同步）
