import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AgentChatMessage } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import {
    AIRawResponse,
    MessageMetadata,
    TokenUsage,
} from "@buildingai/types/ai/agent-config.interface";
import type { Attachment, MessageContent } from "@buildingai/types/ai/message-content.interface";
import { Injectable, Logger } from "@nestjs/common";

import { IMessageHandler } from "../interfaces/chat-handlers.interface";

@Injectable()
export class MessageHandler implements IMessageHandler {
    private readonly logger = new Logger(MessageHandler.name);

    constructor(
        @InjectRepository(AgentChatMessage)
        private readonly chatMessageRepository: Repository<AgentChatMessage>,
    ) {}

    async saveUserMessage(
        conversationId: string,
        agentId: string,
        userId: string,
        content: MessageContent,
        formVariables?: Record<string, string>,
        formFieldsInputs?: Record<string, any>,
        anonymousIdentifier?: string,
        attachments?: Attachment[],
    ): Promise<void> {
        try {
            // 根据 content 类型自动判断 messageType
            let messageType = "text";
            if (Array.isArray(content)) {
                // 检查数组中是否包含图片、视频等
                const hasImage = content.some((item) => item.image_url);
                const hasVideo = content.some((item) => item.video_url);
                const hasAudio = content.some((item) => item.input_audio);
                if (hasImage) {
                    messageType = "image";
                } else if (hasVideo || hasAudio) {
                    messageType = "file";
                }
            } else if (attachments && attachments.length > 0) {
                // 如果有附件，设置为 file 类型
                messageType = "file";
            }

            await this.chatMessageRepository.save({
                conversationId,
                agentId,
                userId: anonymousIdentifier ? null : userId,
                anonymousIdentifier: anonymousIdentifier || null,
                role: "user",
                content,
                messageType,
                formVariables,
                formFieldsInputs,
                attachments: attachments && attachments.length > 0 ? attachments : undefined,
            });
        } catch (err) {
            this.logger.error(`保存用户消息失败: ${err.message}`);
            throw err;
        }
    }

    async saveAssistantMessage(
        conversationId: string,
        agentId: string,
        userId: string,
        content: string,
        tokenUsage?: TokenUsage,
        rawResponse?: AIRawResponse,
        metadata?: MessageMetadata,
        anonymousIdentifier?: string,
    ): Promise<void> {
        try {
            await this.chatMessageRepository.save({
                conversationId,
                agentId,
                userId: anonymousIdentifier ? null : userId,
                anonymousIdentifier: anonymousIdentifier || null,
                role: "assistant",
                content,
                messageType: "text",
                tokens: tokenUsage,
                rawResponse,
                metadata,
            });
        } catch (err) {
            this.logger.error(`保存AI响应消息失败: ${err.message}`);
            throw err;
        }
    }
}
