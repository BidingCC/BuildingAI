import { getProvider, TextGenerator } from "@buildingai/ai-sdk";
import { SecretService } from "@buildingai/core/modules";
import { Agent } from "@buildingai/db/entities";
import { ChatMessage, MessageMetadata } from "@buildingai/types/ai/agent-config.interface";
import { getProviderSecret } from "@buildingai/utils";
import { extractTextFromMessageContent } from "@buildingai/utils";
import { AiModelService } from "@modules/ai/model/services/ai-model.service";
import { Injectable, Logger } from "@nestjs/common";

import { AgentChatDto } from "../dto/agent";
import {
    ChatContextResult,
    DatasetRetrievalResult,
    IChatContextBuilder,
    ModelInfo,
} from "../interfaces/chat-handlers.interface";
import { KnowledgeRetrievalHandler } from "./knowledge-retrieval.handler";

@Injectable()
export class ChatContextBuilder implements IChatContextBuilder {
    private readonly logger = new Logger(ChatContextBuilder.name);

    constructor(
        private readonly aiModelService: AiModelService,
        private readonly SecretService: SecretService,
        private readonly knowledgeRetrievalHandler: KnowledgeRetrievalHandler,
    ) {}

    /**
     * 准备聊天上下文
     */
    async prepareChatContext(config: Agent, dto: AgentChatDto): Promise<ChatContextResult> {
        // 构建系统提示词
        const systemPrompt = this.buildSystemPrompt(
            config,
            dto.formVariables,
            dto.formFieldsInputs,
        );

        // 获取模型信息
        const model = await this.aiModelService.findOne({
            where: { id: config.modelConfig?.id, isActive: true },
            relations: ["provider"],
        });

        if (!model?.provider || !model.id) {
            throw new Error("模型不存在或未激活");
        }

        // 初始化检索结果
        const retrievalResults: DatasetRetrievalResult[] = [];

        // 构建聊天消息
        const messages = this.buildChatsMessages(
            systemPrompt,
            this.limitMessagesByContext(dto.messages as ChatMessage[], model.maxContext),
            retrievalResults,
        );

        return {
            systemPrompt,
            retrievalResults,
            messages,
            model: model as ModelInfo,
        };
    }

    buildSystemPrompt(
        config: Agent,
        formVariables?: Record<string, string>,
        formFieldsInputs?: Record<string, unknown>,
    ): string {
        let prompt = config.rolePrompt || "你是一个有用的AI助手。";

        // 合并变量
        const variables = { ...formVariables, ...formFieldsInputs };

        // 记录所有提供的变量（用于显式声明，包括未在提示词中使用的）
        const allVariables: Array<{ key: string; value: string }> = [];

        // 替换变量占位符
        for (const [key, value] of Object.entries(variables)) {
            if (value === undefined || value === null) return;
            const valueStr = String(value);
            // 记录所有变量（不管是否在提示词中有占位符）
            allVariables.push({ key, value: valueStr });

            // 检查是否在提示词中存在该变量的占位符并替换
            const placeholderRegex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
            if (placeholderRegex.test(prompt)) {
                prompt = prompt.replace(placeholderRegex, valueStr);
            }
        }

        // 如果有提供的变量，在系统提示词开头添加显式声明
        // 这样可以避免AI忽略散落在长文本中的变量值，即使占位符替换失败也能看到所有数据
        if (allVariables.length > 0) {
            const variablesDeclaration = [
                "### 【用户已确认的事实数据（Context Facts）】",
                "以下信息由系统确认，视为已知事实：",
                "规则：",
                "1. 不得再次向用户询问这些变量",
                "2. 可直接基于这些值进行推理和回答",
                "",
                ...allVariables.map((v) => `- ${v.key}: ${v.value}`),
                "",
            ].join("\n");

            prompt = variablesDeclaration + prompt;
        }

        return prompt;
    }

    buildChatsMessages(
        systemPrompt: string,
        messages: ChatMessage[],
        retrievalResults: DatasetRetrievalResult[],
    ): ChatMessage[] {
        let systemContent = systemPrompt;

        // 添加知识库检索内容
        if (retrievalResults.length) {
            systemContent +=
                "\n\n参考知识库内容：\n" +
                retrievalResults
                    .flatMap((result, i) =>
                        result.chunks.map((chunk, j) => `[参考${i + 1}.${j + 1}] ${chunk.content}`),
                    )
                    .join("\n");
        }

        return [{ role: "system", content: systemContent }, ...messages];
    }

    async getAIClient(
        model: ModelInfo,
        config: Agent,
        dto: AgentChatDto,
    ): Promise<{
        client: TextGenerator;
        requestOpts: Record<string, any>;
        modelName: string;
    }> {
        // 获取提供商密钥配置
        const providerSecret = await this.SecretService.getConfigKeyValuePairs(
            model.provider.bindSecretId,
        );

        // 创建提供商实例
        const provider = getProvider(model.provider.provider, {
            apiKey: getProviderSecret("apiKey", providerSecret),
            baseURL: getProviderSecret("baseUrl", providerSecret),
        });

        // 创建文本生成器客户端
        const client = new TextGenerator(provider);

        // 合并模型配置
        const modelConfig = {
            ...model.modelConfig,
            ...config.modelConfig?.options,
            ...dto.modelConfig?.options,
        };

        // 提取启用的配置选项
        const requestOpts = Object.entries(modelConfig)
            .filter(([_, value]) => value && typeof value === "object" && (value as any)?.enable)
            .reduce(
                (acc, [key, value]) => ({
                    ...acc,
                    [key]: (value as any)?.value,
                }),
                {},
            );

        return {
            client,
            requestOpts,
            modelName: model.model,
        };
    }

    async prepareMessageMetadata(
        retrievalResults: DatasetRetrievalResult[],
        messages: ChatMessage[],
        response: string,
        model: ModelInfo,
        config: Agent,
        dto: AgentChatDto,
        lastUserMessage?: ChatMessage,
    ): Promise<MessageMetadata> {
        return {
            references:
                retrievalResults.length > 0
                    ? this.knowledgeRetrievalHandler.formatReferenceSources(
                          retrievalResults,
                          extractTextFromMessageContent(lastUserMessage?.content) || "",
                      )
                    : undefined,
            context: messages,
            suggestions: await this.generateAutoQuestions(messages, response, model, config, dto),
        };
    }

    async generateAutoQuestions(
        messages: ChatMessage[],
        response: string,
        model: ModelInfo,
        config: Agent,
        dto: AgentChatDto,
    ): Promise<string[]> {
        if (!dto.autoQuestions?.enabled) {
            return [];
        }

        const lastUserMessage =
            messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";

        const basePrompt = `你是一个AI助手，根据用户问题和AI回复，生成3个不超过20字的后续问题。要求：与用户问题语义相关，语气一致，引导深入探讨。
用户问题：${lastUserMessage}
AI回复：${response}`;

        const prompt =
            dto.autoQuestions.customRuleEnabled && dto.autoQuestions.customRule
                ? `${basePrompt}\n\n自定义规则：${dto.autoQuestions.customRule}`
                : basePrompt;

        try {
            if (!model) {
                return [];
            }

            const { client, requestOpts, modelName } = await this.getAIClient(model, config, dto);
            const response = await client.chat.create({
                model: modelName,
                messages: [
                    { role: "system", content: prompt },
                    { role: "user", content: "生成3条问题建议" },
                ],
                max_tokens: 100,
                ...requestOpts,
            });

            return response.choices[0].message.content
                .split("\n")
                .filter((q) => q.trim())
                .slice(0, 3)
                .map((q) => q.replace(/^\d+\.\s*/, "").trim());
        } catch (err) {
            this.logger.error(`生成自动追问问题失败: ${err.message}`);
            return [];
        }
    }

    /**
     * 限制消息数量以适应上下文长度
     */
    private limitMessagesByContext(messages: ChatMessage[], maxContext?: number): ChatMessage[] {
        if (!maxContext || messages.length <= maxContext) {
            return messages;
        }
        return messages.slice(-maxContext);
    }
}
