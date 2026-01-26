import { BaseController } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { AiModel } from "@buildingai/db/entities";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { HttpErrorFactory } from "@buildingai/errors";
import { validateArrayItems } from "@buildingai/utils";
import { WebController } from "@common/decorators/controller.decorator";
import {
    ChatRequestDto,
    TextOptimizationRequestDto,
} from "@modules/ai/chat/dto/ai-chat-message.dto";
import {
    ChatCompletionCommandHandler,
    ConversationCommandHandler,
    McpServerCommandHandler,
    McpToolError,
    MembershipValidationCommandHandler,
    MessageContextCommandHandler,
    ModelValidationCommandHandler,
    PowerDeductionCommandHandler,
    TitleGenerationCommandHandler,
    UserCancelledError,
    UserPowerValidationCommandHandler,
} from "@modules/ai/chat/handlers";
import { Body, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import type { ChatCompletionMessageParam } from "openai/resources/index";

/**
 * AI聊天控制器（前台）
 *
 * 提供AI聊天对话功能，支持对话记录保存
 */
@WebController("ai-chat")
export class AiChatMessageWebController extends BaseController {
    constructor(
        private readonly conversationHandler: ConversationCommandHandler,
        private readonly modelValidationHandler: ModelValidationCommandHandler,
        private readonly membershipValidationHandler: MembershipValidationCommandHandler,
        private readonly userPowerValidationHandler: UserPowerValidationCommandHandler,
        private readonly mcpServerHandler: McpServerCommandHandler,
        private readonly messageContextHandler: MessageContextCommandHandler,
        private readonly chatCompletionHandler: ChatCompletionCommandHandler,
        private readonly powerDeductionHandler: PowerDeductionCommandHandler,
        private readonly titleGenerationHandler: TitleGenerationCommandHandler,
    ) {
        super();
    }

    /**
     * 发起聊天对话
     * 支持对话记录保存（通过saveConversation参数控制）
     */
    @Post()
    async chat(@Body() dto: ChatRequestDto, @Playground() user: UserPlayground) {
        try {
            // 1. 确保对话存在并保存用户消息
            let conversationId = dto.conversationId;
            if (dto.saveConversation !== false) {
                conversationId = await this.conversationHandler.ensureConversation(
                    user.id,
                    conversationId,
                    dto.title,
                );

                const userMessage = dto.messages[dto.messages.length - 1];
                if (userMessage) {
                    await this.conversationHandler.saveUserMessage(
                        conversationId,
                        dto.modelId,
                        userMessage as any,
                    );
                }
            }

            // 2. 获取并验证模型
            const model = await this.modelValidationHandler.getAndValidateModel(dto.modelId);

            // 2.1 验证用户会员等级权限
            await this.membershipValidationHandler.validateModelAccessOrThrow(user.id, model);

            // 3. 获取并验证用户积分
            const userInfo = await this.userPowerValidationHandler.getAndValidateUserPower(
                user.id,
                model,
            );

            // 4. 初始化MCP服务器和工具
            const { mcpServers, tools, toolToServerMap } =
                await this.mcpServerHandler.initializeMcpServers(dto.mcpServers);

            // 5. 限制消息上下文
            const limitedMessages = this.messageContextHandler.limitMessageContext(
                dto.messages as any,
                model.maxContext,
            );

            // 6. 执行AI聊天完成（含工具调用）
            const {
                response: finalResponse,
                mcpToolCalls,
                usedTools,
            } = await this.chatCompletionHandler.executeCompletion({
                model,
                messages: limitedMessages,
                tools,
                toolToServerMap,
            });

            // 7. 计算消耗的积分
            const userConsumedPower = this.powerDeductionHandler.calculateConsumedPower(
                finalResponse.usage.total_tokens,
                model.billingRule,
            );

            // 8. 保存AI响应消息
            if (
                dto.saveConversation !== false &&
                conversationId &&
                finalResponse.choices[0].message
            ) {
                await this.conversationHandler.saveAssistantMessage({
                    conversationId,
                    modelId: dto.modelId,
                    content: finalResponse.choices[0].message.content,
                    userConsumedPower,
                    tokens: {
                        prompt_tokens: finalResponse.usage?.prompt_tokens,
                        completion_tokens: finalResponse.usage?.completion_tokens,
                        total_tokens: finalResponse.usage?.total_tokens,
                    },
                    rawResponse: finalResponse,
                    mcpToolCalls,
                });
            }

            // 9. 生成并更新标题（如果需要）
            if (conversationId) {
                const hasReasoningContent = finalResponse?.choices?.[0]?.message?.reasoning_content;

                const title = hasReasoningContent
                    ? this.titleGenerationHandler.generateTitleFromReasoning(dto.messages as any)
                    : await this.titleGenerationHandler.generateTitle(model, dto.messages as any);

                await this.conversationHandler.updateTitle(conversationId, user.id, title);
            }

            // 10. 扣除用户积分
            if (finalResponse?.usage?.total_tokens && model?.billingRule) {
                await this.powerDeductionHandler.deductUserPower(
                    user.id,
                    userInfo,
                    model,
                    userConsumedPower,
                    finalResponse.usage.total_tokens,
                );
            }

            // 11. 清理MCP连接资源
            await this.mcpServerHandler.cleanupMcpServers(mcpServers);

            // 12. 准备MCP信息返回（仅返回实际使用的工具）
            let mcpInfo = null;
            if (usedTools.size > 0) {
                const usedToolsInfo = tools.filter((tool) => usedTools.has(tool.function.name));
                const usedServers = new Set();
                usedTools.forEach((toolName) => {
                    const server = toolToServerMap.get(toolName);
                    if (server) {
                        usedServers.add(server.mcpServer);
                    }
                });

                mcpInfo = {
                    servers: Array.from(usedServers).map((server: any) => ({
                        url: server.options.url,
                        connected: true,
                    })),
                    tools: usedToolsInfo.map((tool) => ({
                        name: tool.function.name,
                        description: tool.function.description,
                        parameters: tool.function.parameters,
                    })),
                    totalTools: usedToolsInfo.length,
                };
            }

            return {
                ...finalResponse,
                conversationId,
                mcpInfo,
            };
        } catch (error) {
            this.logger.error(`聊天对话失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Chat request failed.");
        }
    }

    /**
     * 流式聊天对话
     * 支持对话记录保存（通过saveConversation参数控制）
     */
    @Post("stream")
    async chatStream(
        @Body() dto: ChatRequestDto,
        @Playground() user: UserPlayground,
        @Res() res: Response,
    ) {
        // 设置SSE响应头
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "Cache-Control");

        let conversationId = dto.conversationId;
        let mcpServers: any[] = [];
        const mcpToolCalls: any[] = [];
        let model: AiModel | null = null;
        let userInfo: any = null;

        // Create AbortController for cancellation
        const abortController = new AbortController();
        let isClientDisconnected = false;

        // Listen for client disconnect
        res.on("close", () => {
            if (!res.writableEnded) {
                isClientDisconnected = true;
                this.logger.debug("🔌 客户端断开连接，取消请求");
                abortController.abort();
            }
        });

        try {
            // 1. 获取并验证用户积分（提前验证）
            model = await this.modelValidationHandler.getAndValidateModel(dto.modelId);

            // 1.1 验证用户会员等级权限
            await this.membershipValidationHandler.validateModelAccessOrThrow(user.id, model);

            userInfo = await this.userPowerValidationHandler.getAndValidateUserPower(
                user.id,
                model,
            );

            // 2. 确保对话存在并保存用户消息
            if (dto.saveConversation !== false) {
                conversationId = await this.conversationHandler.ensureConversation(
                    user.id,
                    conversationId,
                    dto.title,
                );

                // 发送对话ID给前端
                res.write(
                    `data: ${JSON.stringify({ type: "conversation_id", data: conversationId })}\n\n`,
                );

                const userMessage = dto.messages[dto.messages.length - 1];
                if (userMessage) {
                    this.logger.debug(`🙋 用户问题: ${userMessage.content}`);
                    await this.conversationHandler.saveUserMessage(
                        conversationId,
                        dto.modelId,
                        userMessage as any,
                    );
                }
            } else {
                // 如果不保存但有conversationId，也发送给前端
                if (conversationId) {
                    res.write(
                        `data: ${JSON.stringify({ type: "conversation_id", data: conversationId })}\n\n`,
                    );
                }

                const userMessage = dto.messages[dto.messages.length - 1];
                if (userMessage) {
                    this.logger.debug(`🙋 用户问题 (不保存): ${userMessage.content}`);
                }
            }

            // 3. 初始化MCP服务器和工具
            const {
                mcpServers: servers,
                tools,
                toolToServerMap,
            } = await this.mcpServerHandler.initializeMcpServers(
                validateArrayItems<string>(dto.mcpServers || [], (item) => typeof item === "string")
                    ? dto.mcpServers
                    : undefined,
            );
            mcpServers = servers;

            // 4. 限制消息上下文
            const limitedMessages = this.messageContextHandler.limitMessageContext(
                dto.messages as any,
                model.maxContext,
            );

            // 5. 执行流式AI聊天完成（含工具调用）
            const {
                fullResponse,
                finalChatCompletion,
                mcpToolCalls: toolCalls,
                reasoningContent,
                reasoningStartTime,
                reasoningEndTime,
            } = await this.chatCompletionHandler.executeStreamCompletion(
                {
                    model,
                    messages: limitedMessages,
                    tools,
                    toolToServerMap,
                },
                res,
                abortController.signal,
            );

            mcpToolCalls.push(...toolCalls);

            // 6. 计算消耗的积分
            const userConsumedPower = this.powerDeductionHandler.calculateConsumedPower(
                finalChatCompletion.usage.total_tokens,
                model.billingRule,
            );

            // 7. 保存AI响应消息
            if (dto.saveConversation !== false && conversationId && fullResponse) {
                this.logger.debug(`🤖 AI回复: ${fullResponse}`);

                // 准备 metadata，包含深度思考数据
                const metadata: Record<string, any> = {};
                if (reasoningContent && reasoningStartTime && reasoningEndTime) {
                    metadata.reasoning = {
                        content: reasoningContent,
                        startTime: reasoningStartTime,
                        endTime: reasoningEndTime,
                        duration: reasoningEndTime - reasoningStartTime,
                    };
                }

                await this.conversationHandler.saveAssistantMessage({
                    conversationId,
                    modelId: dto.modelId,
                    content: fullResponse,
                    userConsumedPower,
                    tokens: {
                        prompt_tokens: finalChatCompletion.usage?.prompt_tokens,
                        completion_tokens: finalChatCompletion.usage?.completion_tokens,
                        total_tokens: finalChatCompletion.usage?.total_tokens,
                    },
                    rawResponse: finalChatCompletion,
                    mcpToolCalls,
                    metadata,
                });
            } else if (dto.saveConversation === false && fullResponse) {
                this.logger.debug(`🤖 AI回复 (不保存): ${fullResponse}`);
            }

            // 8. 生成并更新标题（如果需要）
            if (conversationId) {
                const title = reasoningContent
                    ? this.titleGenerationHandler.generateTitleFromReasoning(dto.messages as any)
                    : await this.titleGenerationHandler.generateTitle(model, dto.messages as any);

                await this.conversationHandler.updateTitle(conversationId, user.id, title);
            }

            // 9. 扣除用户积分
            if (finalChatCompletion?.usage?.total_tokens && model?.billingRule) {
                await this.powerDeductionHandler.deductUserPower(
                    user.id,
                    userInfo,
                    model,
                    userConsumedPower,
                    finalChatCompletion.usage.total_tokens,
                );
            }

            // 10. 清理MCP连接
            await this.mcpServerHandler.cleanupMcpServers(mcpServers);

            // 11. 发送结束标记
            res.write("data: [DONE]\n\n");
            res.end();
        } catch (error) {
            // Clean up MCP connections
            await this.mcpServerHandler.cleanupMcpServers(mcpServers);

            // Handle user cancellation - save partial content if available
            if (error instanceof UserCancelledError || isClientDisconnected) {
                this.logger.debug("🚫 User cancelled the request, ending silently");

                // 如果有部分内容，保存到数据库
                if (error instanceof UserCancelledError && error.partialResponse?.fullResponse) {
                    const partialData = error.partialResponse;
                    this.logger.debug(
                        `💾 保存用户取消时的部分内容: ${partialData.fullResponse.substring(0, 50)}...`,
                    );

                    // 确保 model 和 userInfo 已初始化（如果 abort 发生在初始化之前，则重新获取）
                    if (!model) {
                        model = await this.modelValidationHandler.getAndValidateModel(dto.modelId);
                    }
                    if (!userInfo && model) {
                        userInfo = await this.userPowerValidationHandler.getAndValidateUserPower(
                            user.id,
                            model,
                        );
                    }

                    // 计算消耗的积分（如果有token使用信息）
                    const userConsumedPower =
                        model && partialData.finalChatCompletion?.usage?.total_tokens
                            ? this.powerDeductionHandler.calculateConsumedPower(
                                  partialData.finalChatCompletion.usage.total_tokens,
                                  model.billingRule,
                              )
                            : 0;

                    // 准备 metadata
                    const metadata: Record<string, any> = {};
                    if (
                        partialData.reasoningContent &&
                        partialData.reasoningStartTime &&
                        partialData.reasoningEndTime
                    ) {
                        metadata.reasoning = {
                            content: partialData.reasoningContent,
                            startTime: partialData.reasoningStartTime,
                            endTime: partialData.reasoningEndTime,
                            duration: partialData.reasoningEndTime - partialData.reasoningStartTime,
                        };
                    }

                    // 保存部分内容
                    if (dto.saveConversation !== false && conversationId) {
                        await this.conversationHandler.saveAssistantMessage({
                            conversationId,
                            modelId: dto.modelId,
                            content: partialData.fullResponse,
                            userConsumedPower,
                            tokens: {
                                prompt_tokens:
                                    partialData.finalChatCompletion?.usage?.prompt_tokens || 0,
                                completion_tokens:
                                    partialData.finalChatCompletion?.usage?.completion_tokens || 0,
                                total_tokens:
                                    partialData.finalChatCompletion?.usage?.total_tokens || 0,
                            },
                            rawResponse: partialData.finalChatCompletion,
                            mcpToolCalls: partialData.mcpToolCalls,
                            metadata,
                        });

                        // 扣除用户积分（如果有token使用）
                        if (
                            model &&
                            userInfo &&
                            partialData.finalChatCompletion?.usage?.total_tokens &&
                            model.billingRule
                        ) {
                            await this.powerDeductionHandler.deductUserPower(
                                user.id,
                                userInfo,
                                model,
                                userConsumedPower,
                                partialData.finalChatCompletion.usage.total_tokens,
                            );
                        }
                    }
                }

                if (!res.writableEnded) {
                    try {
                        res.end();
                    } catch {
                        // Ignore write errors on closed connection
                    }
                }
                return;
            }

            // Handle MCP tool error
            if (error instanceof McpToolError) {
                this.logger.error(`MCP 工具调用失败: ${error.toolName} - ${error.message}`);

                // Save error message if conversation exists
                if (conversationId) {
                    await this.conversationHandler.saveAssistantMessage({
                        conversationId,
                        modelId: dto.modelId,
                        content: "",
                        userConsumedPower: 0,
                        tokens: {
                            prompt_tokens: 0,
                            completion_tokens: 0,
                            total_tokens: 0,
                        },
                        rawResponse: error.mcpToolCall,
                        mcpToolCalls,
                        errorMessage: error.message,
                    });
                }

                // Send done signal (error already sent via mcp_tool_error event)
                try {
                    if (!res.writableEnded) {
                        res.write("data: [DONE]\n\n");
                        res.end();
                    }
                } catch {
                    // Ignore write errors
                }
                return;
            }

            // Handle other errors
            this.logger.error(`流式聊天对话失败: ${error.message}`, error.stack);

            // Save error message
            if (conversationId) {
                await this.conversationHandler.saveAssistantMessage({
                    conversationId,
                    modelId: dto.modelId,
                    content: "",
                    userConsumedPower: 0,
                    tokens: {
                        prompt_tokens: 0,
                        completion_tokens: 0,
                        total_tokens: 0,
                    },
                    rawResponse: error,
                    mcpToolCalls,
                    errorMessage: error?.message,
                });
            }

            // Send error via SSE
            try {
                if (!res.writableEnded) {
                    res.write(
                        `data: ${JSON.stringify({
                            type: "error",
                            data: {
                                message: error.message,
                                code: error.code || "INTERNAL_ERROR",
                            },
                        })}\n\n`,
                    );
                    res.write("data: [DONE]\n\n");
                    res.end();
                }
            } catch (writeError) {
                this.logger.error("发送错误信息失败:", writeError);
                throw HttpErrorFactory.badRequest(error.message);
            }
        }
    }

    /**
     * 文案优化接口
     * 非流式返回优化后的文案
     */
    @Post("optimize-text")
    async optimizeText(
        @Body() dto: TextOptimizationRequestDto,
        @Playground() user: UserPlayground,
    ) {
        try {
            // 1. 获取并验证模型
            const model = await this.modelValidationHandler.getAndValidateModel(dto.modelId);

            // 1.1 验证用户会员等级权限
            await this.membershipValidationHandler.validateModelAccessOrThrow(user.id, model);

            // 2. 获取并验证用户积分
            const userInfo = await this.userPowerValidationHandler.getAndValidateUserPower(
                user.id,
                model,
            );

            // 3. 构建优化提示词
            let systemPrompt = `You are a professional copywriting optimization expert. Your task is to optimize text content to make it clearer, more vivid, and more attractive.

CRITICAL RULES:
1. Output language MUST match input language exactly (English→English, Chinese→Chinese, Japanese→Japanese)
2. Keep core meaning and key information unchanged
3. Improve expressiveness and readability
4. Response format: <chat>optimized text</chat> (only the optimized text inside tags, no explanations)`;

            if (dto.optimizationStyle) {
                systemPrompt += `\n\nOptimization Style: ${dto.optimizationStyle}`;
            }

            let userPrompt = `Optimize the following text (keep the same language):\n\n${dto.text}`;

            if (dto.requirements) {
                userPrompt += `\n\nAdditional optimization requirements: ${dto.requirements}`;
            }

            // 4. 构建消息列表
            const messages: ChatCompletionMessageParam[] = [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: userPrompt,
                },
            ];

            // 5. 限制消息上下文
            const limitedMessages = this.messageContextHandler.limitMessageContext(
                messages,
                model.maxContext,
            );

            // 6. 执行AI文案优化（不使用工具）
            const { response: finalResponse } = await this.chatCompletionHandler.executeCompletion({
                model,
                messages: limitedMessages,
                tools: [],
                toolToServerMap: new Map(),
            });

            // 7. 计算消耗的积分
            const userConsumedPower = this.powerDeductionHandler.calculateConsumedPower(
                finalResponse.usage.total_tokens,
                model.billingRule,
            );

            // 8. 扣除用户积分
            if (finalResponse?.usage?.total_tokens && model?.billingRule) {
                await this.powerDeductionHandler.deductUserPower(
                    user.id,
                    userInfo,
                    model,
                    userConsumedPower,
                    finalResponse.usage.total_tokens,
                );
            }

            // 9. 解析并返回优化结果
            const rawContent = finalResponse.choices[0].message.content || dto.text;

            // 尝试从 <chat> 标签中提取内容
            const chatTagMatch = rawContent.match(/<chat>([\s\S]*?)<\/chat>/);
            let optimizedText: string;

            if (chatTagMatch && chatTagMatch[1]) {
                // 找到标签，提取标签内的内容并去除首尾空白
                optimizedText = chatTagMatch[1].trim();
            } else {
                // 没有找到标签，使用原始内容（作为后备方案）
                optimizedText = rawContent.trim();
                this.logger.warn("AI返回内容未包含<chat>标签，使用原始返回内容");
            }

            return {
                originalText: dto.text,
                optimizedText,
                tokens: {
                    prompt_tokens: finalResponse.usage?.prompt_tokens,
                    completion_tokens: finalResponse.usage?.completion_tokens,
                    total_tokens: finalResponse.usage?.total_tokens,
                },
                userConsumedPower,
            };
        } catch (error) {
            this.logger.error(`文案优化失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("文案优化请求失败。");
        }
    }
}
