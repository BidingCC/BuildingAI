# MCP 客户端工具

提供通用的 MCP (Model Context Protocol) 客户端管理功能，支持多种传输方式，可扩展支持自定义客户端（如 tuari）。

## 功能特性

- ✅ **多种传输方式**：支持 SSE、HTTP、StdIO 和自定义传输
- ✅ **工具合并**：自动合并多个 MCP 服务器的工具
- ✅ **资源管理**：自动管理客户端生命周期
- ✅ **类型安全**：完整的 TypeScript 类型定义
- ✅ **可扩展**：支持自定义传输，便于集成第三方客户端

## 核心概念

### 传输类型

- **SSE** (`sse`)：Server-Sent Events 传输，适用于流式 MCP 服务器
- **HTTP** (`http`)：Streamable HTTP 传输，适用于标准 HTTP MCP 服务器
- **StdIO** (`stdio`)：标准输入输出传输，适用于本地进程 MCP 服务器
- **Custom** (`custom`)：自定义传输，可用于集成 tuari 等第三方客户端

### 客户端接口

所有 MCP 客户端都实现 `McpClient` 接口：

```typescript
interface McpClient {
    tools(): Promise<Record<string, unknown>>;
    close(): Promise<void>;
}
```

## 使用示例

### 1. 基本使用 - 单个客户端

```typescript
import { createMcpClient } from "@buildingai/ai-sdk-new";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

// 创建 SSE 客户端
const client = await createMcpClient({
    transport: {
        type: "sse",
        url: "http://localhost:3000/sse",
        headers: { Authorization: "Bearer token" },
    },
});

try {
    // 获取工具
    const tools = await client.tools();

    // 在 AI 模型中使用工具
    const result = await streamText({
        model: openai("gpt-4"),
        tools,
        messages: [{ role: "user", content: "使用工具完成任务" }],
    });

    console.log(result.text);
} finally {
    // 关闭客户端
    await client.close();
}
```

### 2. 从服务器配置创建客户端

```typescript
import { createClientFromServerConfig } from "@buildingai/ai-sdk-new";
import type { McpServerConfig } from "@buildingai/ai-sdk-new";

const serverConfig: McpServerConfig = {
    id: "server-1",
    name: "My MCP Server",
    url: "http://localhost:3000/mcp",
    communicationType: "sse",
    customHeaders: { Authorization: "Bearer token" },
};

const client = await createClientFromServerConfig(serverConfig);

try {
    const tools = await client.tools();
    // 使用工具...
} finally {
    await client.close();
}
```

### 3. 批量创建和合并工具

```typescript
import {
    createClientsFromServerConfigs,
    mergeMcpTools,
    closeMcpClients,
} from "@buildingai/ai-sdk-new";

const configs: McpServerConfig[] = [
    {
        id: "server-1",
        name: "Server 1",
        url: "http://localhost:3000/sse",
        communicationType: "sse",
    },
    {
        id: "server-2",
        name: "Server 2",
        url: "http://localhost:3001/mcp",
        communicationType: "streamable-http",
    },
];

// 批量创建客户端
const clients = await createClientsFromServerConfigs(configs);

try {
    // 合并所有工具
    const allTools = await mergeMcpTools(clients);

    // 在 AI 模型中使用
    const result = await streamText({
        model: openai("gpt-4"),
        tools: allTools,
        messages: [{ role: "user", content: "使用多个工具" }],
    });
} finally {
    // 批量关闭客户端
    await closeMcpClients(clients);
}
```

### 4. 使用 StdIO 传输（本地进程）

```typescript
import { createMcpClient, createStdioTransport } from "@buildingai/ai-sdk-new";

const client = await createMcpClient({
    transport: createStdioTransport("node", ["path/to/server.js"], {
        NODE_ENV: "production",
    }),
});

try {
    const tools = await client.tools();
    // 使用工具...
} finally {
    await client.close();
}
```

### 5. 使用自定义传输（扩展支持）

```typescript
import { createMcpClient, createCustomTransport } from "@buildingai/ai-sdk-new";

// 使用 tuari 客户端或其他自定义传输
const tuariTransport = new TuariClientTransport({ ... });

const client = await createMcpClient({
    transport: createCustomTransport(tuariTransport),
});

try {
    const tools = await client.tools();
    // 使用工具...
} finally {
    await client.close();
}
```

### 6. 在聊天服务中集成

```typescript
import {
    createClientsFromServerConfigs,
    mergeMcpTools,
    closeMcpClients,
    type McpServerConfig,
} from "@buildingai/ai-sdk-new";
import { streamText } from "ai";

async function streamChat(params: { mcpServerIds: string[] }) {
    let mcpClients = [];

    // 根据服务器 ID 加载配置
    const serverConfigs: McpServerConfig[] = await loadServerConfigs(params.mcpServerIds);

    if (serverConfigs.length > 0) {
        mcpClients = await createClientsFromServerConfigs(serverConfigs);
        const mcpTools = await mergeMcpTools(mcpClients);

        try {
            const result = streamText({
                model: provider(model.model).model,
                messages,
                tools: {
                    ...mcpTools,
                    // 其他工具...
                },
            });

            // 处理结果...
        } finally {
            // 确保关闭客户端
            await closeMcpClients(mcpClients);
        }
    }
}
```

## API 参考

### 类型定义

```typescript
// MCP 通信类型
type McpCommunicationType = "sse" | "streamable-http";

// MCP 服务器配置
interface McpServerConfig {
    id: string;
    name: string;
    description?: string;
    url: string;
    communicationType: McpCommunicationType;
    customHeaders?: Record<string, string>;
    env?: Record<string, string>;
}

// 传输配置
type McpTransportConfig =
    | { type: "sse"; url: string; headers?: Record<string, string> }
    | { type: "http"; url: string; headers?: Record<string, string> }
    | { type: "stdio"; command: string; args?: string[]; env?: Record<string, string> }
    | { type: "custom"; transport: unknown };

// MCP 客户端接口
interface McpClient {
    tools(): Promise<Record<string, unknown>>;
    close(): Promise<void>;
}
```

### 函数

#### `createMcpClient(options)`

创建 MCP 客户端实例。

**参数：**
- `options.transport`: 传输配置
- `options.name?`: 客户端名称（可选）
- `options.version?`: 客户端版本（可选）

**返回：** `Promise<McpClient>`

#### `createClientFromServerConfig(config, options?)`

从服务器配置创建单个客户端。

**参数：**
- `config`: MCP 服务器配置
- `options?`: 可选的客户端选项

**返回：** `Promise<McpClient>`

#### `createClientsFromServerConfigs(configs, options?)`

批量从服务器配置创建客户端。

**参数：**
- `configs`: MCP 服务器配置数组
- `options?`: 可选的客户端选项

**返回：** `Promise<McpClient[]>`

#### `mergeMcpTools(clients)`

合并多个客户端的工具。

**参数：**
- `clients`: MCP 客户端数组

**返回：** `Promise<Record<string, unknown>>`

**注意：** 如果多个客户端有同名工具，后续客户端的工具会覆盖前面的。

#### `closeMcpClients(clients)`

批量关闭客户端连接。

**参数：**
- `clients`: MCP 客户端数组

**返回：** `Promise<void>`

#### `createTransportFromConfig(config)`

将服务器配置转换为传输配置。

**参数：**
- `config`: MCP 服务器配置

**返回：** `McpTransportConfig`

#### `createStdioTransport(command, args?, env?)`

创建 StdIO 传输配置。

**参数：**
- `command`: 命令
- `args?`: 命令参数（可选）
- `env?`: 环境变量（可选）

**返回：** `McpTransportConfig`

#### `createCustomTransport(transport)`

创建自定义传输配置。

**参数：**
- `transport`: 自定义传输实例（如 tuari 客户端）

**返回：** `McpTransportConfig`

## 设计原则

1. **通用性**：不依赖具体实现，只定义接口和通用逻辑
2. **可扩展性**：支持自定义传输，便于集成第三方客户端
3. **简洁性**：每个函数职责单一，避免过度封装
4. **类型安全**：完整的 TypeScript 类型定义
5. **资源管理**：提供统一的资源清理机制

## 注意事项

1. **资源清理**：使用完客户端后务必调用 `close()` 方法，避免资源泄露
2. **工具命名冲突**：合并工具时，同名工具会被覆盖，使用时需要注意
3. **错误处理**：创建和关闭客户端时应该处理可能的错误
4. **传输选择**：
   - **SSE**：适用于实时流式场景
   - **HTTP**：适用于标准 HTTP 服务器
   - **StdIO**：仅适用于本地进程
   - **Custom**：用于特殊场景或第三方客户端

## 依赖

- `@ai-sdk/mcp`: MCP 客户端核心库
- `@ai-sdk/mcp/mcp-stdio`: StdIO 传输支持
