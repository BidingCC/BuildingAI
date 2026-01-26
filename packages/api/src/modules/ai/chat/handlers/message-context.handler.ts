import { Injectable, Logger } from "@nestjs/common";
import type { ChatCompletionMessageParam } from "openai/resources/index";

/**
 * Message Context Command Handler
 *
 * Handles message context limitation based on model's maxContext setting.
 */
@Injectable()
export class MessageContextCommandHandler {
    private readonly logger = new Logger(MessageContextCommandHandler.name);

    /**
     * Clear reasoning_content from history messages.
     * For DeepSeek Thinking Mode: when a new question starts, reasoning_content
     * from previous questions should be removed to save bandwidth.
     *
     * @param messages - Messages array to process
     * @returns Processed messages with reasoning_content cleared
     */
    clearReasoningContent(messages: ChatCompletionMessageParam[]): ChatCompletionMessageParam[] {
        return messages.map((message) => {
            if (message.role === "assistant" && "reasoning_content" in message) {
                const { _reasoning_content, ...rest } = message as any;
                return rest;
            }
            return message;
        });
    }

    /**
     * Limit messages based on model's maxContext setting
     * Preserves system message if exists and keeps most recent messages
     *
     * @param messages - Original messages array
     * @param maxContext - Maximum context count from model config
     * @returns Limited messages array
     */
    limitMessageContext(
        messages: ChatCompletionMessageParam[],
        maxContext?: number,
    ): ChatCompletionMessageParam[] {
        // Clear reasoning_content from history messages for DeepSeek Thinking Mode compatibility
        let processedMessages = this.clearReasoningContent(messages);

        if (!maxContext || maxContext <= 0 || processedMessages.length <= maxContext) {
            return processedMessages;
        }

        let limitedMessages = [...processedMessages];

        // Find system message
        const systemMessageIndex = limitedMessages.findIndex((msg) => msg.role === "system");

        if (systemMessageIndex !== -1) {
            // If system message exists, preserve it
            const systemMessage = limitedMessages[systemMessageIndex];
            // Remove system message from array
            limitedMessages.splice(systemMessageIndex, 1);

            // Take last (maxContext - 1) messages
            const remainingCount = maxContext - 1;
            if (limitedMessages.length > remainingCount) {
                limitedMessages = limitedMessages.slice(-remainingCount);
            }

            // Put system message at the beginning
            limitedMessages.unshift(systemMessage);
        } else {
            // No system message, just take last maxContext messages
            limitedMessages = limitedMessages.slice(-maxContext);
        }

        this.logger.debug(
            `🔄 上下文限制: 原始消息数 ${messages.length}, 限制后消息数 ${limitedMessages.length}, 最大上下文 ${maxContext}`,
        );

        return limitedMessages;
    }
}
