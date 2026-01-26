import { getProvider, TextGenerator } from "@buildingai/ai-sdk";
import { SecretService } from "@buildingai/core/modules";
import { Agent } from "@buildingai/db/entities";
import { AgentReferenceSources } from "@buildingai/types/ai/agent-config.interface";
import { RetrievalChunk, RetrievalConfig } from "@buildingai/types/ai/retrieval-config.interface";
import { getProviderSecret } from "@buildingai/utils";
import { Injectable, Logger } from "@nestjs/common";

import { DatasetsService } from "../../datasets/services/datasets.service";
import { DatasetsRetrievalService } from "../../datasets/services/datasets-retrieval.service";
import { AgentChatDto } from "../dto/agent";
import {
    DatasetRetrievalResult,
    IKnowledgeRetrievalHandler,
    ModelInfo,
} from "../interfaces/chat-handlers.interface";

/**
 * 知识库检索处理器
 * 负责知识库检索逻辑和引用源格式化
 */
@Injectable()
export class KnowledgeRetrievalHandler implements IKnowledgeRetrievalHandler {
    private readonly logger = new Logger(KnowledgeRetrievalHandler.name);

    constructor(
        private readonly datasetsService: DatasetsService,
        private readonly datasetsRetrievalService: DatasetsRetrievalService,
        private readonly SecretService: SecretService,
    ) {}

    /**
     * 判断是否需要执行检索
     */
    async shouldPerformRetrieval(
        userQuery: string,
        model: ModelInfo,
        config: Agent,
        dto: AgentChatDto,
    ): Promise<boolean> {
        // 基础检查：是否配置了知识库，是否为简单问候语
        if (
            !config.datasetIds?.length ||
            /^(你好|hello|hi|哈喽|嗨|谢谢|thank you|thanks|再见|goodbye|bye|没事|没关系|不用了|ok|好的|嗯|哦)$/i.test(
                userQuery.trim(),
            )
        ) {
            return false;
        }

        // 执行预检索
        const preSearchResults = await this.performPreSearch(config.datasetIds, userQuery);
        if (!preSearchResults.length) {
            return true;
        }

        // 使用AI判断是否需要完整检索
        try {
            const { client, requestOpts, modelName } = await this.getAIClient(model, config, dto);
            const chunksContent = preSearchResults
                .slice(0, 3)
                .map((chunk, i) => `[片段${i + 1}] ${chunk.content.substring(0, 200)}...`)
                .join("\n\n");

            const judgmentPrompt = `你是一个智能检索助手。你的唯一任务是：根据用户问题和预检索结果，判断是否需要进一步的「完整知识库检索」。
【输入】
用户问题：${userQuery}
预检索结果：${chunksContent}  

【决策规则（进取模式）】
- 若预检索结果与问题"高度相关" → {"need_retrieval": true, "reason": "预检索结果高度相关，执行完整检索以补充证据/覆盖面"}
- 若预检索结果"相关但可能不够全面或不够精确" → {"need_retrieval": true, "reason": "相关但可能不完整，需更精确检索"}
- 若预检索结果"不相关 / 仅为闲聊问候" → {"need_retrieval": false, "reason": "与知识库无关或无有效线索"}

【强约束】
- 严格只输出一个 JSON 对象，不得包含任何额外文本。
- 不得把"只需返回 JSON""格式要求""用户仅要求返回 JSON"等当作理由。
- 不引用本提示本身或输出格式作为理由。
- 若无法确定，默认 {"need_retrieval": true, "reason": "默认进取策略：不确定时执行完整检索"}。

【输出格式】
{"need_retrieval": true/false, "reason": "原因说明（不超过 10 字）"}`;

            const response = await client.chat.create({
                model: modelName,
                messages: [
                    { role: "system", content: judgmentPrompt },
                    { role: "user", content: "返回JSON格式结果" },
                ],
                max_tokens: 150,
                temperature: 0.1,
                ...requestOpts,
            });

            const content = response.choices[0].message.content?.trim() || "";
            const result = JSON.parse(content.match(/\{[^}]+\}/)?.[0] || "{}");
            return result.need_retrieval ?? true;
        } catch (error) {
            this.logger.error(`检索判断失败: ${error.message}`);
            return true; // 默认执行检索
        }
    }

    /**
     * 执行知识库检索
     */
    async performKnowledgeRetrieval(
        datasetIds: string[],
        query: string,
    ): Promise<DatasetRetrievalResult[]> {
        const results = await Promise.all(
            datasetIds.map(async (datasetId) => {
                const startTime = Date.now();

                try {
                    const dataset = await this.getDatasetConfig(datasetId);
                    if (!dataset) {
                        return null;
                    }

                    const result = await this.datasetsRetrievalService.queryDatasetWithConfig(
                        datasetId,
                        query,
                        dataset.retrievalConfig,
                    );

                    if (!result.chunks?.length) {
                        return null;
                    }

                    return {
                        datasetId,
                        datasetName: dataset.name,
                        retrievalConfig: dataset.retrievalConfig,
                        chunks: result.chunks,
                        duration: Date.now() - startTime,
                    };
                } catch (error) {
                    this.logger.error(`知识库 ${datasetId} 检索失败: ${error.message}`);
                    return null;
                }
            }),
        );

        return results.filter(Boolean) as DatasetRetrievalResult[];
    }

    /**
     * 格式化引用源
     */
    formatReferenceSources(
        retrievalResults: DatasetRetrievalResult[],
        content: string,
    ): AgentReferenceSources[] {
        return retrievalResults.map((result) => ({
            datasetId: result.datasetId,
            datasetName: result.datasetName || "知识库",
            userContent: content,
            retrievalMode: result.retrievalConfig?.retrievalMode,
            duration: result.duration,
            chunks: result.chunks,
        }));
    }

    /**
     * 执行预检索
     */
    private async performPreSearch(datasetIds: string[], query: string): Promise<RetrievalChunk[]> {
        const results = await Promise.all(
            datasetIds.map(async (datasetId) => {
                try {
                    const dataset = await this.getDatasetConfig(datasetId);
                    if (!dataset) {
                        return [];
                    }

                    const result = await this.datasetsRetrievalService.queryDatasetWithConfig(
                        datasetId,
                        query,
                        {
                            retrievalMode: "vector",
                            topK: 3,
                            scoreThreshold: 0.3,
                            scoreThresholdEnabled: false,
                        },
                    );

                    return result.chunks || [];
                } catch (error) {
                    this.logger.error(`预检索失败 - 知识库 ${datasetId}: ${error.message}`);
                    return [];
                }
            }),
        );

        return results
            .flat()
            .filter((chunk, i, arr) => arr.findIndex((c) => c.id === chunk.id) === i)
            .sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    /**
     * 获取知识库配置
     */
    private async getDatasetConfig(datasetId: string): Promise<{
        id: string;
        name: string;
        retrievalConfig: RetrievalConfig;
    } | null> {
        try {
            const dataset = await this.datasetsService.findOneById(datasetId);
            return dataset
                ? {
                      id: dataset.id,
                      name: dataset.name,
                      retrievalConfig: dataset.retrievalConfig,
                  }
                : null;
        } catch (error) {
            this.logger.error(`获取知识库配置失败: ${error.message}`);
            return null;
        }
    }

    /**
     * 获取AI客户端（用于检索判断）
     */
    private async getAIClient(
        model: ModelInfo,
        config: Agent,
        dto: AgentChatDto,
    ): Promise<{
        client: TextGenerator;
        requestOpts: Record<string, any>;
        modelName: string;
    }> {
        const providerSecret = await this.SecretService.getConfigKeyValuePairs(
            model.provider.bindSecretId,
        );
        const provider = getProvider(model.provider.provider, {
            apiKey: getProviderSecret("apiKey", providerSecret),
            baseURL: getProviderSecret("baseUrl", providerSecret),
        });
        const client = new TextGenerator(provider);

        const modelConfig = {
            ...model.modelConfig,
            ...config.modelConfig?.options,
            ...dto.modelConfig?.options,
        };
        const requestOpts = Object.entries(modelConfig)
            .filter(([_, value]) => value && typeof value === "object" && (value as any)?.enable)
            .reduce(
                (acc, [key, value]) => ({
                    ...acc,
                    [key]: (value as any)?.value,
                }),
                {},
            );

        return { client, requestOpts, modelName: model.model };
    }
}
