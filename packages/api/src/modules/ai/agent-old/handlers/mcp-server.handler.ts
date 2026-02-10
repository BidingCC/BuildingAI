import { convertMCPToolsToOpenAI, McpServerSSE, type MCPTool } from "@buildingai/ai-sdk";
import { AiMcpServer } from "@buildingai/db/entities";
import { AiMcpServerService } from "@modules/ai/mcp/services/ai-mcp-server.service";
import { Injectable, Logger } from "@nestjs/common";
import type { ChatCompletionFunctionTool } from "openai/resources/index";

/**
 * MCP server initialization result
 */
export interface McpServerInitResult {
    mcpServers: McpServerSSE[];
    tools: ChatCompletionFunctionTool[];
    toolToServerMap: Map<string, { server: AiMcpServer; tool: MCPTool; mcpServer: McpServerSSE }>;
}

/**
 * MCP Server Handler
 *
 * Handles MCP server initialization, tool management, and cleanup for agent module.
 */
@Injectable()
export class McpServerHandler {
    private readonly logger = new Logger(McpServerHandler.name);

    constructor(private readonly aiMcpServerService: AiMcpServerService) {}

    /**
     * Initialize MCP servers and get available tools
     *
     * @param mcpServerIds - Array of MCP server IDs
     * @returns Initialization result with servers, tools, and mappings
     */
    async initializeMcpServers(mcpServerIds?: string[]): Promise<McpServerInitResult> {
        const mcpServers: McpServerSSE[] = [];
        const tools: ChatCompletionFunctionTool[] = [];
        const toolToServerMap = new Map<
            string,
            { server: AiMcpServer; tool: MCPTool; mcpServer: McpServerSSE }
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
                    const mcpServer = new McpServerSSE({
                        url: server.url,
                        name: server.name,
                        description: server.description,
                        headers: server.headers,
                    });

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
                        `MCP server connected: ${server.name || server.url}, loaded ${mcpTools.length} tools`,
                    );
                }
            } catch (error) {
                // Silently handle MCP connection failures, don't affect normal chat flow
                this.logger.warn(`MCP server connection failed, skipping: ${error.message}`);
            }
        }

        return { mcpServers, tools, toolToServerMap };
    }

    /**
     * Cleanup MCP server connections
     *
     * @param mcpServers - Array of MCP server instances
     */
    async cleanupMcpServers(mcpServers: McpServerSSE[]): Promise<void> {
        for (const mcpServer of mcpServers) {
            try {
                await mcpServer.disconnect();
            } catch (error) {
                this.logger.warn(`MCP connection cleanup failed: ${error.message}`);
            }
        }
    }
}
