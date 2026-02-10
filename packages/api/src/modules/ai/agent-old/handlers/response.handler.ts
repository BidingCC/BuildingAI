import { ChatCompletionStream, McpServerSSE, type MCPTool } from "@buildingai/ai-sdk";
import { type UserPlayground } from "@buildingai/db";
import { Agent } from "@buildingai/db/entities";
import { AgentChatRecord } from "@buildingai/db/entities";
import { AiMcpServer } from "@buildingai/db/entities";
import {
    AIRawResponse,
    ChatMessage,
    TokenUsage,
} from "@buildingai/types/ai/agent-config.interface";
import { extractTextFromMessageContent } from "@buildingai/utils";
import { Injectable, Logger } from "@nestjs/common";
import type { Response } from "express";
import {
    ChatCompletion,
    ChatCompletionCreateParams,
    ChatCompletionFunctionTool,
    ChatCompletionMessageParam,
} from "openai/resources/index";

import { AgentChatDto, AgentChatResponse } from "../dto/agent";
import {
    DatasetRetrievalResult,
    IResponseHandler,
    ModelInfo,
} from "../interfaces/chat-handlers.interface";
import { AiAgentChatRecordService } from "../services/ai-agent-chat-record.service";
import { UserUtil } from "../utils/user.util";
import { ChatContextBuilder } from "./chat-context.builder";
import { KnowledgeRetrievalHandler } from "./knowledge-retrieval.handler";
import { MessageHandler } from "./message.handler";
import { ToolCallHandler } from "./tool-call.handler";

@Injectable()
export class ResponseHandler implements IResponseHandler {
    private readonly logger = new Logger(ResponseHandler.name);

    constructor(
        private readonly messageHandler: MessageHandler,
        private readonly chatContextBuilder: ChatContextBuilder,
        private readonly knowledgeRetrievalHandler: KnowledgeRetrievalHandler,
        private readonly AiAgentChatRecordService: AiAgentChatRecordService,
        private readonly toolCallHandler: ToolCallHandler,
    ) {}

    async handleStreamingResponse(
        client: {
            chat: {
                stream: (params: ChatCompletionCreateParams) => Promise<ChatCompletionStream>;
            };
        },
        modelName: string,
        messages: ChatMessage[],
        requestOpts: Record<string, any>,
        res: Response,
        context: {
            conversationId?: string;
            agentId: string;
            user: UserPlayground;
            agent: Agent;
            dto: AgentChatDto;
            finalConfig: Agent;
            retrievalResults: DatasetRetrievalResult[];
            model: ModelInfo;
            conversationRecord?: AgentChatRecord | null;
            startTime: number;
            shouldIncludeReferences: boolean;
            lastUserMessage?: ChatMessage;
            billingResult?: { billToUser: any; billingContext: string };
            tools?: ChatCompletionFunctionTool[];
            toolToServerMap?: Map<
                string,
                { server: AiMcpServer; tool: MCPTool; mcpServer: McpServerSSE }
            >;
            mcpServers?: McpServerSSE[];
            abortSignal?: AbortSignal;
        },
    ): Promise<void> {
        const {
            conversationId,
            agentId,
            user,
            dto,
            finalConfig,
            retrievalResults,
            model,
            conversationRecord,
            shouldIncludeReferences,
            lastUserMessage,
            billingResult,
            tools = [],
            toolToServerMap,
            abortSignal,
        } = context;

        // 发送引用信息（如果需要）
        if (shouldIncludeReferences && retrievalResults.length) {
            const referenceSources = this.knowledgeRetrievalHandler.formatReferenceSources(
                retrievalResults,
                typeof lastUserMessage === "string"
                    ? lastUserMessage
                    : extractTextFromMessageContent(lastUserMessage?.content) || "",
            );
            res.write(
                `data: ${JSON.stringify({ type: "references", data: referenceSources })}\n\n`,
            );
        }

        // 发送对话ID（如果是新创建的）
        if (conversationId && !dto.conversationId) {
            res.write(
                `data: ${JSON.stringify({ type: "conversation_id", data: conversationId })}\n\n`,
            );
        }

        // 在发送对话ID后进行积分检查
        if (
            billingResult?.billToUser &&
            finalConfig.billingConfig?.price > billingResult.billToUser.power
        ) {
            res.write(
                `data: ${JSON.stringify({
                    type: "error",
                    data: {
                        message: `${billingResult.billingContext}不足，请充值`,
                        code: 40602,
                    },
                })}\n\n`,
            );
            res.write("data: [DONE]\n\n");
            res.end();
            return;
        }

        let fullResponse = "";
        let tokenUsage: TokenUsage | undefined;
        let reasoningContent = "";
        let reasoningStartTime: number | null = null;
        const mcpToolCalls: any[] = [];
        let currentMessages = [...messages];
        let hasToolCalls = false;

        try {
            // Tool call loop for MCP support
            do {
                // Check if user cancelled
                if (abortSignal?.aborted) {
                    this.logger.debug("🚫 User cancelled the request, ending silently");
                    return;
                }

                hasToolCalls = false;

                const chatParams: ChatCompletionCreateParams = {
                    model: modelName,
                    messages: currentMessages as unknown as ChatCompletionMessageParam[],
                    ...requestOpts,
                };

                // Add tools if available
                if (tools.length > 0 && toolToServerMap) {
                    chatParams.tools = tools;
                    chatParams.tool_choice = "auto";
                }

                // 创建流式请求
                const stream = await client.chat.stream(chatParams);

                // 处理流式数据
                for await (const chunk of stream) {
                    // Check if user cancelled during streaming
                    if (abortSignal?.aborted) {
                        this.logger.debug("🚫 User cancelled the request, ending silently");
                        stream.cancel();
                        return;
                    }

                    if (chunk.choices[0].delta.content) {
                        const content = chunk.choices[0].delta.content;
                        fullResponse += content;
                        res.write(`data: ${JSON.stringify({ type: "chunk", data: content })}\n\n`);
                    }

                    if ((chunk.choices[0].delta as any).reasoning_content) {
                        reasoningContent += (chunk.choices[0].delta as any).reasoning_content;
                        if (!reasoningStartTime) reasoningStartTime = Date.now();
                        res.write(
                            `data: ${JSON.stringify({ type: "reasoning", data: (chunk.choices[0].delta as any).reasoning_content })}\n\n`,
                        );
                    }

                    // Handle tool call detection
                    if (chunk.choices[0].delta?.tool_calls) {
                        const toolCalls = chunk.choices[0].delta.tool_calls;
                        for (const toolCall of toolCalls) {
                            if (toolCall.type !== "function") continue;
                            if (toolCall.function?.name) {
                                const mcpServerUsed = toolToServerMap?.get(toolCall.function.name);
                                res.write(
                                    `data: ${JSON.stringify({
                                        type: "mcp_tool_detected",
                                        data: {
                                            id: toolCall.id,
                                            mcpServer: mcpServerUsed?.server,
                                            tool: mcpServerUsed?.tool,
                                        },
                                    })}\n\n`,
                                );
                            }
                        }
                    }
                }

                // 获取最终结果
                const finalChatCompletion = await stream.finalChatCompletion();
                tokenUsage = finalChatCompletion.usage as TokenUsage;

                // Check for tool calls
                const assistantMessage = finalChatCompletion.choices[0].message;
                if (
                    assistantMessage.tool_calls &&
                    assistantMessage.tool_calls.length > 0 &&
                    toolToServerMap
                ) {
                    hasToolCalls = true;

                    // Add AI response to messages
                    // Keep reasoning_content for DeepSeek thinking mode multi-turn tool calls
                    currentMessages.push(assistantMessage);

                    // Execute tool calls
                    const { results } = await this.toolCallHandler.executeToolCalls(
                        assistantMessage.tool_calls,
                        toolToServerMap,
                    );

                    // Add tool results to messages and collect mcp tool calls
                    for (let i = 0; i < results.length; i++) {
                        const result = results[i];
                        const toolCall = assistantMessage.tool_calls[i];

                        const toolContent = JSON.stringify(result.toolResult);
                        currentMessages.push({
                            role: "tool",
                            content: toolContent,
                            tool_call_id: toolCall.id,
                        });

                        if (result.mcpToolCall) {
                            mcpToolCalls.push(result.mcpToolCall);

                            if (result.mcpToolCall.status === "success") {
                                // Send tool result to client
                                res.write(
                                    `data: ${JSON.stringify({
                                        type: "mcp_tool_result",
                                        data: result.mcpToolCall,
                                    })}\n\n`,
                                );
                            } else {
                                // Send tool error and end conversation
                                res.write(
                                    `data: ${JSON.stringify({
                                        type: "mcp_tool_error",
                                        data: result.mcpToolCall,
                                    })}\n\n`,
                                );

                                // MCP tool error - end conversation immediately
                                this.logger.error(
                                    `❌ MCP tool call failed, ending conversation: ${result.mcpToolCall.tool?.name || "unknown"}`,
                                );
                                return;
                            }
                        }
                    }

                    // 如果有工具调用，继续循环以生成基于工具结果的回复
                    if (hasToolCalls) {
                        res.write(`data: ${JSON.stringify({ type: "tool_calls_completed" })}\n\n`);
                    }
                }
            } while (hasToolCalls);

            // 准备元数据
            const metadata = await this.chatContextBuilder.prepareMessageMetadata(
                retrievalResults,
                messages,
                fullResponse,
                model,
                finalConfig,
                dto,
                lastUserMessage,
            );

            // 添加推理内容到元数据
            if (reasoningContent && reasoningStartTime) {
                metadata.reasoning = {
                    content: reasoningContent,
                    startTime: reasoningStartTime,
                    endTime: Date.now(),
                    duration: Date.now() - reasoningStartTime,
                };
            }

            // 保存AI响应消息
            if (dto.saveConversation !== false && conversationId) {
                const isAnonymous = UserUtil.isAnonymousUser(user);
                // Add MCP tool calls to metadata
                if (mcpToolCalls.length > 0) {
                    if (!metadata.mcpToolCalls) {
                        metadata.mcpToolCalls = [];
                    }
                    metadata.mcpToolCalls = mcpToolCalls;
                }
                await this.messageHandler.saveAssistantMessage(
                    conversationId,
                    agentId,
                    user.id,
                    fullResponse,
                    tokenUsage,
                    null as unknown as AIRawResponse,
                    metadata,
                    isAnonymous ? user.id : undefined,
                );

                // 更新对话记录统计
                if (conversationRecord) {
                    await this.AiAgentChatRecordService.updateChatRecordStats(
                        conversationRecord.id,
                        conversationRecord.messageCount + 2,
                        conversationRecord.totalTokens + (tokenUsage?.total_tokens || 0),
                    );
                }
            }

            // 发送上下文信息
            if (finalConfig.showContext) {
                res.write(
                    `data: ${JSON.stringify({
                        type: "context",
                        data: [...messages, { role: "assistant", content: fullResponse }],
                    })}\n\n`,
                );
            }

            // 发送建议问题
            if (metadata.suggestions?.length) {
                res.write(
                    `data: ${JSON.stringify({ type: "suggestions", data: metadata.suggestions })}\n\n`,
                );
            }
        } catch (error) {
            this.logger.error(`流式响应处理失败: ${error.message}`);

            // 保存错误消息
            if (conversationRecord && dto.saveConversation !== false) {
                const isAnonymous = UserUtil.isAnonymousUser(user);
                await this.messageHandler.saveAssistantMessage(
                    conversationRecord.id,
                    agentId,
                    user.id,
                    error.message,
                    { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                    error,
                    null,
                    isAnonymous ? user.id : undefined,
                );
            }

            // 发送错误信息
            res.write(
                `data: ${JSON.stringify({
                    type: "error",
                    data: {
                        message: error.message,
                        code: error.code || "INTERNAL_ERROR",
                    },
                })}\n\n`,
            );
        } finally {
            res.write("data: [DONE]\n\n");
            res.end();
        }
    }

    async handleBlockingResponse(
        client: {
            chat: {
                create: (params: ChatCompletionCreateParams) => Promise<ChatCompletion>;
            };
        },
        modelName: string,
        messages: ChatMessage[],
        requestOpts: Record<string, any>,
        context: {
            conversationId?: string;
            agentId: string;
            user: UserPlayground;
            agent: Agent;
            dto: AgentChatDto;
            finalConfig: Agent;
            retrievalResults: DatasetRetrievalResult[];
            model: ModelInfo;
            conversationRecord?: AgentChatRecord | null;
            startTime: number;
            shouldIncludeReferences: boolean;
            lastUserMessage?: ChatMessage;
            tools?: ChatCompletionFunctionTool[];
            toolToServerMap?: Map<
                string,
                { server: AiMcpServer; tool: MCPTool; mcpServer: McpServerSSE }
            >;
            mcpServers?: McpServerSSE[];
        },
    ): Promise<AgentChatResponse> {
        const {
            agentId,
            user,
            dto,
            finalConfig,
            retrievalResults,
            model,
            conversationRecord,
            startTime,
            shouldIncludeReferences,
            lastUserMessage,
            tools = [],
            toolToServerMap,
        } = context;

        try {
            let currentMessages = [...messages];
            let fullResponse = "";
            let tokenUsage: TokenUsage | undefined;
            let hasToolCalls = false;
            const mcpToolCalls: any[] = [];

            // Tool call loop for MCP support
            do {
                hasToolCalls = false;

                const chatParams: ChatCompletionCreateParams = {
                    model: modelName,
                    messages: currentMessages as unknown as ChatCompletionMessageParam[],
                    ...requestOpts,
                };

                // Add tools if available
                if (tools.length > 0 && toolToServerMap) {
                    chatParams.tools = tools;
                    chatParams.tool_choice = "auto";
                }

                // 发起AI请求
                const response = await client.chat.create(chatParams);

                fullResponse = response.choices[0].message.content || "";
                tokenUsage = response.usage as TokenUsage;

                // Check for tool calls
                const assistantMessage = response.choices[0].message;
                if (
                    assistantMessage.tool_calls &&
                    assistantMessage.tool_calls.length > 0 &&
                    toolToServerMap
                ) {
                    hasToolCalls = true;

                    // Add AI response to messages
                    // Keep reasoning_content for DeepSeek thinking mode multi-turn tool calls
                    currentMessages.push(assistantMessage as any);

                    // Execute tool calls
                    const { results } = await this.toolCallHandler.executeToolCalls(
                        assistantMessage.tool_calls,
                        toolToServerMap,
                    );

                    // Add tool results to messages and collect mcp tool calls
                    for (let i = 0; i < results.length; i++) {
                        const result = results[i];
                        const toolCall = assistantMessage.tool_calls[i];

                        const toolContent = JSON.stringify(result.toolResult);
                        currentMessages.push({
                            role: "tool",
                            content: toolContent,
                            tool_call_id: toolCall.id,
                        });

                        if (result.mcpToolCall) {
                            mcpToolCalls.push(result.mcpToolCall);
                        }
                    }
                }
            } while (hasToolCalls);

            // 准备元数据
            const metadata = await this.chatContextBuilder.prepareMessageMetadata(
                retrievalResults,
                messages,
                fullResponse,
                model,
                finalConfig,
                dto,
                lastUserMessage,
            );

            // 保存AI响应消息
            if (dto.saveConversation !== false && conversationRecord) {
                const isAnonymous = UserUtil.isAnonymousUser(user);
                // Add MCP tool calls to metadata
                if (mcpToolCalls.length > 0) {
                    if (!metadata.mcpToolCalls) {
                        metadata.mcpToolCalls = [];
                    }
                    metadata.mcpToolCalls = mcpToolCalls;
                }
                await this.messageHandler.saveAssistantMessage(
                    conversationRecord.id,
                    agentId,
                    user.id,
                    fullResponse,
                    tokenUsage,
                    null as unknown as AIRawResponse,
                    metadata,
                    isAnonymous ? user.id : undefined,
                );

                // 更新对话记录统计
                await this.AiAgentChatRecordService.updateChatRecordStats(
                    conversationRecord.id,
                    conversationRecord.messageCount + 2,
                    conversationRecord.totalTokens + (tokenUsage?.total_tokens || 0),
                );
            }

            // 构建响应结果
            const result: AgentChatResponse = {
                conversationId: conversationRecord?.id || null,
                response: fullResponse,
                responseTime: Date.now() - startTime,
                tokenUsage: this.convertTokenUsage(tokenUsage),
                suggestions: metadata.suggestions || [],
            };

            // 添加引用源（如果需要）
            if (shouldIncludeReferences && retrievalResults.length) {
                result.referenceSources = this.convertReferenceSources(metadata.references);
            }

            return result;
        } catch (error) {
            this.logger.error(`阻塞响应处理失败: ${error.message}`);

            // 保存错误消息
            if (conversationRecord && dto.saveConversation !== false) {
                const isAnonymous = UserUtil.isAnonymousUser(user);
                await this.messageHandler.saveAssistantMessage(
                    conversationRecord.id,
                    agentId,
                    user.id,
                    error.message,
                    { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                    error,
                    null,
                    isAnonymous ? user.id : undefined,
                );
            }

            throw error;
        }
    }

    /**
     * 转换Token使用量格式
     */
    private convertTokenUsage(usage?: TokenUsage):
        | {
              totalTokens: number;
              promptTokens: number;
              completionTokens: number;
          }
        | undefined {
        if (!usage) return undefined;
        return {
            totalTokens: usage.total_tokens || usage.totalTokens || 0,
            promptTokens: usage.prompt_tokens || usage.promptTokens || 0,
            completionTokens: usage.completion_tokens || usage.completionTokens || 0,
        };
    }

    /**
     * 转换引用源格式
     */
    private convertReferenceSources(
        references?: Array<{
            datasetId: string;
            datasetName?: string;
            chunks: any[];
        }>,
    ): AgentChatResponse["referenceSources"] {
        if (!references) return undefined;
        return references.map((ref) => ({
            datasetId: ref.datasetId,
            datasetName: ref.datasetName || "知识库",
            chunks: ref.chunks,
        }));
    }
}
