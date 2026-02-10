import type { McpClient } from "./types";

/**
 * 合并多个 MCP 客户端的工具
 * 注意：如果多个客户端有同名工具，后续客户端的工具会覆盖前面的
 *
 * @param clients MCP 客户端数组
 * @returns 合并后的工具集合
 */
export async function mergeMcpTools(clients: McpClient[]): Promise<Record<string, unknown>> {
    const allTools: Record<string, unknown> = {};

    for (const client of clients) {
        const tools = await client.tools();
        Object.assign(allTools, tools);
    }

    return allTools;
}

/**
 * 批量关闭 MCP 客户端
 *
 * @param clients MCP 客户端数组
 */
export async function closeMcpClients(clients: McpClient[]): Promise<void> {
    await Promise.all(clients.map((client) => client.close().catch(console.error)));
}
