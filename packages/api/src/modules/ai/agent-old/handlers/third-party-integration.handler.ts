import { Agent } from "@buildingai/db/entities";
import { AgentChatRecord } from "@buildingai/db/entities";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";

import { AgentChatDto } from "../dto/agent";
import { IThirdPartyIntegrationHandler } from "../interfaces/chat-handlers.interface";
import { AiAgentChatRecordService } from "../services/ai-agent-chat-record.service";
import { MessageHandler } from "./message.handler";

/**
 * 通用第三方平台集成处理器
 * 支持多种第三方平台集成：Dify、OpenAI、Claude、自定义平台等
 */
@Injectable()
export class ThirdPartyIntegrationHandler implements IThirdPartyIntegrationHandler {
    private readonly logger = new Logger(ThirdPartyIntegrationHandler.name);

    private readonly CHAT_HANDLER_SLOT = "agent.chat.handlers";

    constructor(
        private readonly AiAgentChatRecordService: AiAgentChatRecordService,
        private readonly messageHandler: MessageHandler,
    ) {}

    /**
     * 检查是否启用第三方集成
     */
    isThirdPartyIntegrationEnabled(agent: Agent, dto: AgentChatDto): boolean {
        const thirdPartyConfig = dto.thirdPartyIntegration || agent.thirdPartyIntegration;
        return agent.createMode && agent.createMode !== "direct" && !!thirdPartyConfig;
    }

    /**
     * 验证第三方配置
     */
    validateThirdPartyConfig(agent: Agent, dto: AgentChatDto): void {
        // 如果 createMode 是 direct 或 null，则不需要第三方配置
        if (!agent.createMode || agent.createMode === "direct") {
            return;
        }

        // 第三方平台需要配置（优先使用 dto 中的配置，如果没有则使用 agent 中的配置）
        const thirdPartyConfig = dto.thirdPartyIntegration || agent.thirdPartyIntegration;
        if (!thirdPartyConfig) {
            throw new BadRequestException("第三方集成配置缺失");
        }
    }

    // /**
    //  * 处理第三方集成聊天
    //  */
    // async handleThirdPartyIntegrationChat(
    //     agent: Agent,
    //     dto: AgentChatDto,
    //     user: UserPlayground,
    //     options: ResponseHandlerOptions,
    //     conversationRecord?: AgentChatRecord | null,
    // ): Promise<AgentChatResponse | void> {
    //     const { responseMode, res, billingResult, billingHandler } = options;
    //     const platform = this.getThirdPartyPlatform(agent, dto);
    //     const isAnonymous = this.isAnonymousUser(user);

    //     this.logger.log(`[ThirdParty] Using platform: ${platform} for agent ${agent.id}`);

    //     // 获取对应平台的聊天处理器插件服务
    //     const chatService = getServiceByPlatform(platform, this.CHAT_HANDLER_SLOT);
    //     if (!chatService) {
    //         this.logger.error(
    //             `Platform ${platform} chat handler not found in slot: ${this.CHAT_HANDLER_SLOT}`,
    //         );
    //         throw new BadRequestException(
    //             `未找到平台 ${platform} 的聊天处理器，请确保对应插件已注册到 "${this.CHAT_HANDLER_SLOT}" 插槽`,
    //         );
    //     }

    //     this.logger.debug(
    //         `Found chat service for platform ${platform}: ${chatService.constructor.name}`,
    //     );

    //     // 阻塞模式：先检查积分再处理
    //     if (responseMode === "blocking") {
    //         if (
    //             billingResult?.billToUser &&
    //             agent.billingConfig?.price > billingResult.billToUser.power
    //         ) {
    //             throw new BadRequestException(`${billingResult.billingContext}不足，请充值`);
    //         }

    //         // 准备第三方对话上下文
    //         const enhancedDto = await this.prepareThirdPartyContext(
    //             dto,
    //             conversationRecord,
    //             platform,
    //         );

    //         const result = await chatService.handleChat(agent, enhancedDto, user.id);

    //         // 保存第三方对话ID到metadata
    //         if (result && conversationRecord) {
    //             await this.saveThirdPartyConversationId(conversationRecord, platform, result);
    //         }

    //         // 更新对话记录统计信息
    //         if (conversationRecord) {
    //             await this.AiAgentChatRecordService.updateChatRecordStats(
    //                 conversationRecord.id,
    //                 conversationRecord.messageCount + 2,
    //                 conversationRecord.totalTokens,
    //             );
    //         }

    //         // 扣除积分
    //         if (billingHandler) {
    //             await billingHandler.deductAgentChatPower(
    //                 agent,
    //                 billingResult?.billToUser,
    //                 user,
    //                 conversationRecord,
    //             );
    //         }

    //         // 修正返回的对话ID：确保返回的是我们系统内部的对话记录ID，而不是第三方的ID
    //         if (result && conversationRecord) {
    //             return {
    //                 ...result,
    //                 conversationId: conversationRecord.id, // 使用我们系统的对话记录ID
    //             };
    //         }

    //         return result;
    //     } else {
    //         // 流式模式
    //         if (!res) {
    //             throw new Error("流式模式需要响应对象");
    //         }

    //         // 流式模式：先检查积分，避免浪费第三方API调用
    //         if (
    //             billingResult?.billToUser &&
    //             agent.billingConfig?.price > billingResult.billToUser.power
    //         ) {
    //             // 立即返回积分不足错误
    //             res.write(
    //                 `data: ${JSON.stringify({
    //                     type: "error",
    //                     data: {
    //                         message: `${billingResult.billingContext}不足，请充值`,
    //                         code: 40602,
    //                     },
    //                 })}\n\n`,
    //             );
    //             res.write("data: [DONE]\n\n");
    //             res.end();
    //             return;
    //         }

    //         // 发送系统对话ID（如果是新创建的）
    //         if (conversationRecord && !dto.conversationId) {
    //             res.write(
    //                 `data: ${JSON.stringify({ type: "conversation_id", data: conversationRecord.id })}\n\n`,
    //             );
    //         }

    //         // 积分充足，开始处理第三方流式响应
    //         try {
    //             // 准备第三方对话上下文
    //             const enhancedDto = await this.prepareThirdPartyContext(
    //                 dto,
    //                 conversationRecord,
    //                 platform,
    //             );

    //             await chatService.handleChatStreamWithResponse(
    //                 agent,
    //                 enhancedDto,
    //                 user.id,
    //                 res,
    //                 conversationRecord,
    //                 this.createSaveAssistantMessageCallbackWithThirdPartyId(
    //                     conversationRecord,
    //                     platform,
    //                 ),
    //             );

    //             // 更新对话记录统计信息
    //             if (conversationRecord) {
    //                 await this.AiAgentChatRecordService.updateChatRecordStats(
    //                     conversationRecord.id,
    //                     conversationRecord.messageCount + 2,
    //                     conversationRecord.totalTokens,
    //                 );
    //             }

    //             // 在成功完成对话后扣除积分
    //             if (billingHandler && billingResult?.billToUser) {
    //                 await billingHandler.deductAgentChatPower(
    //                     agent,
    //                     billingResult.billToUser,
    //                     user,
    //                     conversationRecord,
    //                 );
    //             }
    //         } catch (error) {
    //             this.logger.error(`第三方流式处理失败: ${error.message}`);
    //             throw error;
    //         }
    //     }
    // }

    /**
     * 获取第三方平台类型
     */
    private getThirdPartyPlatform(agent: Agent): string {
        return agent.createMode;
    }

    /**
     * 准备第三方对话上下文
     * 从 metadata 中获取第三方对话ID并设置到 DTO 中
     */
    private async prepareThirdPartyContext(
        dto: AgentChatDto,
        conversationRecord: AgentChatRecord | null,
        platform: string,
    ): Promise<AgentChatDto> {
        if (!conversationRecord?.metadata) {
            return {
                ...dto,
                conversationId: undefined,
            };
        }

        const thirdPartyConversationKey = `${platform}_conversation_id`;
        const thirdPartyConversationId = conversationRecord.metadata[thirdPartyConversationKey];

        if (thirdPartyConversationId) {
            return {
                ...dto,
                conversationId: thirdPartyConversationId,
            };
        }

        return {
            ...dto,
            conversationId: undefined,
        };
    }

    /**
     * 保存第三方对话ID到对话记录的metadata中
     */
    private async saveThirdPartyConversationId(
        conversationRecord: AgentChatRecord,
        platform: string,
        result: any,
    ): Promise<void> {
        if (!result?.conversationId) {
            return;
        }

        const thirdPartyConversationKey = `${platform}_conversation_id`;
        const updatedMetadata = {
            ...conversationRecord.metadata,
            [thirdPartyConversationKey]: result.conversationId,
            [`${platform}_last_updated`]: new Date().toISOString(),
        };

        try {
            await this.AiAgentChatRecordService.updateMetadata(
                conversationRecord.id,
                updatedMetadata,
            );
            this.logger.log(
                `[ThirdParty] Saved ${platform} conversation ID: ${result.conversationId} to record ${conversationRecord.id}`,
            );
        } catch (error) {
            this.logger.error(
                `[ThirdParty] Failed to save ${platform} conversation ID: ${error.message}`,
            );
        }
    }

    /**
     * 创建保存助手消息的回调函数（包含第三方对话ID处理）
     */
    private createSaveAssistantMessageCallbackWithThirdPartyId(
        conversationRecord: AgentChatRecord | null,
        platform: string,
    ) {
        return async (
            conversationId: string,
            agentId: string,
            userId: string,
            content: string,
            usage?: Record<string, any>,
            rawResponse?: Record<string, any>,
            metadata?: Record<string, any>,
            anonymousIdentifier?: string,
        ) => {
            // 提取第三方对话ID并保存到对话记录的metadata中
            // 优先从 metadata 中获取，其次从 rawResponse 中获取
            const thirdPartyConversationId =
                metadata?.conversationId || rawResponse?.conversationId;
            if (conversationRecord && thirdPartyConversationId) {
                this.logger.log(
                    `[ThirdParty] Saving ${platform} conversation ID: ${thirdPartyConversationId} for record ${conversationRecord.id}`,
                );
                await this.saveThirdPartyConversationId(conversationRecord, platform, {
                    conversationId: thirdPartyConversationId,
                });
            } else {
                this.logger.warn(
                    `[ThirdParty] No conversation ID found to save. metadata: ${JSON.stringify(metadata)}, rawResponse: ${JSON.stringify(rawResponse)}`,
                );
            }

            // 直接调用 messageHandler 保存消息，确保使用我们系统的对话记录ID
            return await this.messageHandler.saveAssistantMessage(
                conversationRecord ? conversationRecord.id : conversationId, // 确保使用系统内部ID
                agentId,
                userId,
                content,
                usage,
                rawResponse,
                metadata,
                anonymousIdentifier,
            );
        };
    }
}
