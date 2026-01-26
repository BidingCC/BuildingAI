import { getProvider, TextGenerator } from "@buildingai/ai-sdk";
import { SecretService } from "@buildingai/core/modules";
import { AiModel } from "@buildingai/db/entities";
import { extractTextFromMessageContent, getProviderSecret } from "@buildingai/utils";
import { Injectable, Logger } from "@nestjs/common";
import type { ChatCompletionMessageParam } from "openai/resources/index";

/**
 * Title Generation Command Handler
 *
 * Handles automatic title generation for conversations.
 */
@Injectable()
export class TitleGenerationCommandHandler {
    private readonly logger = new Logger(TitleGenerationCommandHandler.name);

    constructor(private readonly secretService: SecretService) {}

    /**
     * Generate conversation title using AI
     * Falls back to truncated user message if AI generation fails
     *
     * @param model - AI Model
     * @param messages - Conversation messages
     * @returns Generated or fallback title
     */
    async generateTitle(model: AiModel, messages: ChatCompletionMessageParam[]): Promise<string> {
        const userMessage = messages.find((item) => item.role === "user");
        const rawContent = userMessage?.content;

        // Extract text content (handles both string and array cases)
        const textContent = extractTextFromMessageContent(rawContent as any);

        try {
            if (!textContent) {
                return "new Chat";
            }

            const providerSecret = await this.secretService.getConfigKeyValuePairs(
                model.provider.bindSecretId,
            );

            const provider = getProvider(model.provider.provider, {
                apiKey: getProviderSecret("apiKey", providerSecret),
                baseURL: getProviderSecret("baseUrl", providerSecret),
                timeout: 10000,
            });

            const client = new TextGenerator(provider);

            const response = await client.chat.create({
                model: model.model,
                messages: [
                    {
                        role: "system",
                        content:
                            "你是一个专门生成标题的AI助手。请根据用户提供的内容，先判断用户的问题主要使用的语言（中文或英文），然后用该语言生成标题。请提炼出一个<chat-title></chat-title>除外的**20个字以内**（若为英文，控制在5个单词以内）的简洁标题，准确概括用户的问题。只输出标题，不要回答任何无关内容，并用<chat-title></chat-title>标签包裹，格式严格如下：<chat-title>生成的标题</chat-title>",
                    },
                    {
                        role: "user",
                        content: textContent.slice(0, 1000),
                    },
                ],
            });

            const result = response.choices[0].message.content;

            if (!result) return this.getFallbackTitle(textContent);

            const match = result.match(/<chat-title>([\s\S]*?)<\/chat-title>/);

            if (match && match[1]) {
                return match[1].trim();
            }

            return this.getFallbackTitle(textContent);
        } catch (error) {
            this.logger.error(
                `Failed to generate conversation title: ${error.message}`,
                error.stack,
            );
            return this.getFallbackTitle(textContent);
        }
    }

    /**
     * Generate title from reasoning content (for reasoning models)
     * Uses first 20 characters of user message
     *
     * @param messages - Conversation messages
     * @returns Generated title
     */
    generateTitleFromReasoning(messages: ChatCompletionMessageParam[]): string {
        const userMessage = messages.find((msg) => msg.role === "user");
        const rawContent = userMessage?.content;

        // Extract text content (handles both string and array cases)
        const textContent = extractTextFromMessageContent(rawContent as any);

        if (!textContent) {
            return "新对话";
        }

        return textContent.slice(0, 20) + (textContent.length > 20 ? "..." : "");
    }

    /**
     * Get fallback title when AI generation fails
     *
     * @param content - User message content (string)
     * @returns Fallback title
     */
    private getFallbackTitle(content: string): string {
        return content ? content.slice(0, 20) : "new Chat";
    }
}
