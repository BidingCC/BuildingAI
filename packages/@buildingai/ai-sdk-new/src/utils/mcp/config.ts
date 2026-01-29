import type { McpServerConfig, McpTransportConfig } from "./types";

/**
 * 将 MCP 服务器配置转换为传输配置
 *
 * @param config MCP 服务器配置
 * @returns 传输配置
 */
export function createTransportFromConfig(config: McpServerConfig): McpTransportConfig {
    const { url, communicationType, headers } = config;

    switch (communicationType) {
        case "sse": {
            return {
                type: "sse",
                url,
                ...(headers && { headers }),
            };
        }
        case "streamable-http": {
            return {
                type: "http",
                url,
                ...(headers && { headers }),
            };
        }
        default: {
            const _exhaustive: never = communicationType;
            throw new Error(`Unsupported communication type: ${JSON.stringify(_exhaustive)}`);
        }
    }
}

/**
 * 创建 stdio 传输配置
 * 用于本地 MCP 服务器
 *
 * @param command 命令
 * @param args 命令参数
 * @param env 环境变量
 * @returns stdio 传输配置
 */
export function createStdioTransport(
    command: string,
    args?: string[],
    env?: Record<string, string>,
): McpTransportConfig {
    return {
        type: "stdio",
        command,
        args,
        env,
    };
}

/**
 * 创建自定义传输配置
 * 用于扩展，如 tuari 客户端
 *
 * @param transport 自定义传输实例
 * @returns 自定义传输配置
 */
export function createCustomTransport(transport: unknown): McpTransportConfig {
    return {
        type: "custom",
        transport,
    };
}
