/**
 * MCP 通信传输方式
 */
export type McpCommunicationType = "sse" | "streamable-http";

/**
 * MCP 服务器配置接口
 */
export interface McpServerConfig {
    /**
     * 服务器 ID
     */
    id: string;
    /**
     * 服务器名称
     */
    name: string;
    /**
     * 服务器描述
     */
    description?: string;
    /**
     * 服务器 URL
     */
    url: string;
    /**
     * 通信传输方式
     */
    communicationType: McpCommunicationType;
    /**
     * 自定义请求头
     */
    customHeaders?: Record<string, string>;
    /**
     * 环境变量（用于 stdio 传输）
     */
    env?: Record<string, string>;
}

/**
 * MCP 客户端传输配置
 * 支持多种传输方式
 */
export type McpTransportConfig =
    | {
          type: "sse";
          url: string;
          headers?: Record<string, string>;
      }
    | {
          type: "http";
          url: string;
          headers?: Record<string, string>;
      }
    | {
          type: "stdio";
          command: string;
          args?: string[];
          env?: Record<string, string>;
      }
    | {
          type: "custom";
          transport: unknown; // 允许自定义传输，如 tuari 客户端
      };

/**
 * MCP 客户端接口
 * 提供统一的客户端操作接口
 */
export interface McpClient {
    /**
     * 获取工具集合
     */
    tools(): Promise<Record<string, unknown>>;
    /**
     * 关闭客户端连接
     */
    close(): Promise<void>;
}

/**
 * MCP 客户端创建选项
 */
export interface CreateMcpClientOptions {
    /**
     * 传输配置
     */
    transport: McpTransportConfig;
    /**
     * 客户端名称（可选）
     */
    name?: string;
    /**
     * 客户端版本（可选）
     */
    version?: string;
}
