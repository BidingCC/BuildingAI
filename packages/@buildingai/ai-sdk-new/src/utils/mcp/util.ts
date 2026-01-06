import { ChatCompletionFunctionTool } from "openai/resources/index.js";

import { MCPTool } from "./type";

export function convertMCPToolToOpenAI(mcpTool: MCPTool): ChatCompletionFunctionTool {
    return {
        type: "function",
        function: {
            name: mcpTool.name,
            description: mcpTool.description,
            parameters: mcpTool.inputSchema || {},
        },
    };
}

export function convertMCPToolsToOpenAI(mcpTools: MCPTool[]): ChatCompletionFunctionTool[] {
    return mcpTools.map(convertMCPToolToOpenAI);
}
