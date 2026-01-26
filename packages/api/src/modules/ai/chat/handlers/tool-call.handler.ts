import { McpServerHttp, McpServerSSE, type MCPTool } from "@buildingai/ai-sdk";
import { AiMcpServer, McpToolCall } from "@buildingai/db/entities";
import { Injectable, Logger } from "@nestjs/common";
import type { ChatCompletionMessageToolCall } from "openai/resources/index";

/**
 * Tool call execution result
 */
export interface ToolCallResult {
    toolResult: any;
    mcpToolCall: McpToolCall | null;
}

/**
 * Tool Call Command Handler
 *
 * Handles MCP tool execution and result tracking.
 */
@Injectable()
export class ToolCallCommandHandler {
    private readonly logger = new Logger(ToolCallCommandHandler.name);

    /**
     * Execute a single tool call
     *
     * @param toolCall - Tool call information from AI
     * @param toolToServerMap - Mapping from tool name to server info
     * @returns Tool execution result and call record
     */
    async executeToolCall(
        toolCall: ChatCompletionMessageToolCall,
        toolToServerMap: Map<
            string,
            { server: AiMcpServer; tool: MCPTool; mcpServer: McpServerSSE | McpServerHttp }
        >,
    ): Promise<ToolCallResult> {
        // Check tool call type
        if (toolCall.type !== "function") {
            return { toolResult: null, mcpToolCall: null };
        }

        // Find corresponding MCP server using mapping
        const mcpServerUsed = toolToServerMap.get(toolCall.function.name);

        if (!mcpServerUsed) {
            const errorResult = {
                error: `未找到工具: ${toolCall.function.name}`,
            };
            this.logger.warn(`工具未找到: ${toolCall.function.name}`);
            return { toolResult: errorResult, mcpToolCall: null };
        }

        try {
            // Parse tool arguments
            const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
            const startTime = Date.now();

            this.logger.debug(
                `🔧 开始调用 MCP 工具: ${toolCall.function.name}, 参数: ${JSON.stringify(toolArgs).substring(0, 100)}`,
            );

            // Call MCP tool (with auto-reconnect built-in)
            const toolResult = await mcpServerUsed.mcpServer.callTool(
                toolCall.function.name,
                toolArgs,
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            this.logger.log(`✅ 工具 ${toolCall.function.name} 执行完成，耗时 ${duration}ms`);

            const mcpToolCall: McpToolCall = {
                id: toolCall.id,
                mcpServer: mcpServerUsed.server,
                tool: mcpServerUsed.tool,
                input: toolArgs,
                output: toolResult,
                timestamp: startTime,
                status: "success",
                duration: duration,
            };

            return { toolResult, mcpToolCall };
        } catch (error) {
            const isConnectionError =
                error.message?.includes("connect") ||
                error.message?.includes("timeout") ||
                error.message?.includes("ECONNREFUSED") ||
                error.message?.includes("ENOTFOUND");

            this.logger.error(
                `❌ 工具调用失败 ${toolCall.function.name}: ${error.message}${isConnectionError ? " (连接错误)" : ""}`,
                error.stack,
            );

            const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
            const errorResult = {
                error: error.message,
                isConnectionError,
            };

            const mcpToolCall: McpToolCall = {
                id: toolCall.id,
                mcpServer: mcpServerUsed.server,
                tool: mcpServerUsed.tool,
                input: toolArgs,
                output: errorResult,
                timestamp: Date.now(),
                status: "error",
                error: error.message,
            };

            return { toolResult: errorResult, mcpToolCall };
        }
    }

    /**
     * Execute multiple tool calls
     *
     * @param toolCalls - Array of tool calls
     * @param toolToServerMap - Mapping from tool name to server info
     * @returns Array of tool results and call records
     */
    async executeToolCalls(
        toolCalls: ChatCompletionMessageToolCall[],
        toolToServerMap: Map<
            string,
            { server: AiMcpServer; tool: MCPTool; mcpServer: McpServerSSE | McpServerHttp }
        >,
    ): Promise<{ results: ToolCallResult[]; usedToolNames: Set<string> }> {
        const results: ToolCallResult[] = [];
        const usedToolNames = new Set<string>();

        for (const toolCall of toolCalls) {
            const result = await this.executeToolCall(toolCall, toolToServerMap);
            results.push(result);

            // Track used tool names
            if (toolCall.type === "function" && result.mcpToolCall?.status === "success") {
                usedToolNames.add(toolCall.function.name);
            }
        }

        return { results, usedToolNames };
    }
}
