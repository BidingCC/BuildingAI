import { createMcpClient } from "./client";
import { createTransportFromConfig } from "./config";
import type { McpClient, McpServerConfig } from "./types";

/**
 * 从服务器配置创建 MCP 客户端
 *
 * @param config MCP 服务器配置
 * @param options 可选的客户端选项
 * @returns MCP 客户端实例
 */
export async function createClientFromServerConfig(
    config: McpServerConfig,
    options?: { name?: string; version?: string },
): Promise<McpClient> {
    const transport = createTransportFromConfig(config);

    return createMcpClient({
        transport,
        name: options?.name || config.name,
        version: options?.version,
    });
}

/**
 * 批量从服务器配置创建 MCP 客户端
 *
 * @param configs MCP 服务器配置数组
 * @param options 可选的客户端选项
 * @returns MCP 客户端数组
 */
export async function createClientsFromServerConfigs(
    configs: McpServerConfig[],
    options?: { name?: string; version?: string },
): Promise<McpClient[]> {
    return Promise.all(configs.map((config) => createClientFromServerConfig(config, options)));
}
