import { McpServerSSE, type MCPTool } from "@buildingai/ai-sdk";
import { McpToolCall } from "@buildingai/db/entities";
import { AiMcpServer } from "@buildingai/db/entities";
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
 * Tool Call Handler
 *
 * Handles MCP tool execution and result tracking for agent module.
 */
@Injectable()
export class ToolCallHandler {
    private readonly logger = new Logger(ToolCallHandler.name);

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
            { server: AiMcpServer; tool: MCPTool; mcpServer: McpServerSSE }
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
                error: `Tool not found: ${toolCall.function.name}`,
            };
            this.logger.warn(`Tool not found: ${toolCall.function.name}`);
            return { toolResult: errorResult, mcpToolCall: null };
        }

        try {
            // Parse tool arguments
            const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
            const startTime = Date.now();

            // Call MCP tool
            const toolResult = await mcpServerUsed.mcpServer.callTool(
                toolCall.function.name,
                toolArgs,
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            this.logger.log(`Tool ${toolCall.function.name} executed in ${duration}ms`);

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
            this.logger.error(`Tool call failed: ${error.message}`, error.stack);

            const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
            const errorResult = { error: error.message };

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
            { server: AiMcpServer; tool: MCPTool; mcpServer: McpServerSSE }
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
