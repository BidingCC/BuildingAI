import {
    convertMCPToolsToOpenAI,
    McpServerHttp,
    McpServerSSE,
    type MCPTool,
} from "@buildingai/ai-sdk";
import { AiMcpServer, McpCommunicationType } from "@buildingai/db/entities";
import { AiMcpServerService } from "@modules/ai/mcp/services/ai-mcp-server.service";
import { Injectable, Logger } from "@nestjs/common";
import type { ChatCompletionFunctionTool } from "openai/resources/index";

/**
 * MCP Server initialization result
 */
export interface McpServerInitResult {
    mcpServers: McpServerSSE[];
    tools: ChatCompletionFunctionTool[];
    toolToServerMap: Map<
        string,
        { server: AiMcpServer; tool: MCPTool; mcpServer: McpServerSSE | McpServerHttp }
    >;
}

/**
 * MCP Server Command Handler
 *
 * Handles MCP server initialization, tool management, and cleanup.
 */
@Injectable()
export class McpServerCommandHandler {
    private readonly logger = new Logger(McpServerCommandHandler.name);

    constructor(private readonly aiMcpServerService: AiMcpServerService) {}

    /**
     * Initialize MCP servers and get available tools
     *
     * @param mcpServerIds - Array of MCP server IDs
     * @returns Initialization result with servers, tools, and mappings
     */
    async initializeMcpServers(mcpServerIds?: string[]): Promise<McpServerInitResult> {
        const mcpServers: any[] = [];
        const tools: ChatCompletionFunctionTool[] = [];
        const toolToServerMap = new Map<
            string,
            { server: AiMcpServer; tool: MCPTool; mcpServer: McpServerSSE | McpServerHttp }
        >();

        if (!mcpServerIds || mcpServerIds.length === 0) {
            return { mcpServers, tools, toolToServerMap };
        }

        for (const mcpServerId of mcpServerIds) {
            try {
                const server = await this.aiMcpServerService.findOne({
                    where: { id: mcpServerId },
                });

                if (server && server.url) {
                    let mcpServer: McpServerSSE | McpServerHttp;
                    if (McpCommunicationType.SSE == server.communicationType) {
                        mcpServer = new McpServerSSE({
                            url: server.url,
                            name: server.name,
                            description: server.description,
                            customHeaders: server.customHeaders,
                        });
                    } else {
                        mcpServer = new McpServerHttp({
                            url: server.url,
                            name: server.name,
                            description: server.description,
                            customHeaders: server.customHeaders,
                        });
                    }

                    await mcpServer.connect();
                    mcpServers.push(mcpServer);

                    // Get tools list
                    const mcpTools = await mcpServer.getToolsList();
                    const openAITools = convertMCPToolsToOpenAI(mcpTools);
                    tools.push(...openAITools);

                    // Build tool name to server mapping
                    for (const tool of mcpTools) {
                        toolToServerMap.set(tool.name, {
                            server: server as AiMcpServer,
                            tool: tool,
                            mcpServer: mcpServer,
                        });
                    }

                    this.logger.log(
                        `MCP服务连接成功: ${server.name || server.url}, 获取到 ${mcpTools.length} 个工具`,
                    );
                }
            } catch (error) {
                // Silently handle MCP connection failures, don't affect normal chat flow
                this.logger.warn(`MCP服务连接失败，将跳过该服务: ${error.message}`);
            }
        }

        return { mcpServers, tools, toolToServerMap };
    }

    /**
     * Clean up MCP server connections
     *
     * @param mcpServers - Array of MCP servers to disconnect
     */
    async cleanupMcpServers(mcpServers: McpServerSSE[]): Promise<void> {
        for (const mcpServer of mcpServers) {
            try {
                await mcpServer.disconnect();
            } catch (error) {
                this.logger.warn(`MCP连接清理失败: ${error.message}`);
            }
        }
    }
}
