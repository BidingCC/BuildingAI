import { getProvider, getReasoningOptions } from "@buildingai/ai-sdk-new";
import { SecretService } from "@buildingai/core/modules";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DatasetsDocument } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { getProviderSecret } from "@buildingai/utils";
import { AiModelService } from "@modules/ai/model/services/ai-model.service";
import { DatasetsConfigService } from "@modules/config/services/datasets-config.service";
import { Injectable, Logger } from "@nestjs/common";
import { generateText, Output } from "ai";
import { z } from "zod";

const SUMMARY_INPUT_MAX_CHARS = 3000;

const summarySchema = z.object({
    summary: z.string().describe("一句话文档摘要"),
    tags: z.array(z.string()).max(5).describe("2-5个主题标签"),
});

@Injectable()
export class DocumentSummaryService {
    private readonly logger = new Logger(DocumentSummaryService.name);

    constructor(
        @InjectRepository(DatasetsDocument)
        private readonly documentRepository: Repository<DatasetsDocument>,
        private readonly aiModelService: AiModelService,
        private readonly secretService: SecretService,
        private readonly datasetsConfigService: DatasetsConfigService,
    ) {}

    async generateAndSave(documentId: string, rawText: string): Promise<void> {
        const input = rawText.trim().slice(0, SUMMARY_INPUT_MAX_CHARS);
        if (!input) {
            this.logger.warn(`Document ${documentId}: no text for summary`);
            return;
        }

        const model = await this.getChatModel();
        if (!model?.provider?.isActive) {
            this.logger.warn("No active chat model for document summary, skip");
            return;
        }

        await this.documentRepository
            .createQueryBuilder()
            .update()
            .set({ summaryGenerating: true })
            .where("id = :id", { id: documentId })
            .execute();

        try {
            const providerSecret = await this.secretService.getConfigKeyValuePairs(
                model.provider.bindSecretId!,
            );
            const provider = getProvider(model.provider.provider, {
                apiKey: getProviderSecret("apiKey", providerSecret),
                baseURL: getProviderSecret("baseUrl", providerSecret) || undefined,
            });

            const result = await generateText({
                model: provider(model.model).model,
                output: Output.object({ schema: summarySchema }),
                prompt: `根据以下文档开头内容，生成：
1. summary：一句话摘要（中文，不超过80字）
2. tags：3-5个主题标签（中文，每标签不超过10字）

文档内容：
${input}`,
                providerOptions: getReasoningOptions(model.provider.provider, {
                    thinking: false,
                }),
            });

            const { summary, tags } = result.output;
            const normalizedTags =
                Array.isArray(tags) && tags.length > 0
                    ? tags
                          .slice(0, 5)
                          .map((t) => String(t).trim())
                          .filter(Boolean)
                    : null;

            await this.documentRepository
                .createQueryBuilder()
                .update()
                .set({
                    summary: summary?.trim() || null,
                    tags: normalizedTags,
                })
                .where("id = :id", { id: documentId })
                .execute();
            this.logger.log(`Document summary saved: ${documentId}`);
        } catch (err: any) {
            this.logger.warn(`Document summary failed for ${documentId}: ${err?.message}`);
        } finally {
            await this.documentRepository
                .createQueryBuilder()
                .update()
                .set({ summaryGenerating: false })
                .where("id = :id", { id: documentId })
                .execute();
        }
    }

    private async getChatModel() {
        const config = await this.datasetsConfigService.getConfig();
        const textModelId = config.textModelId?.trim();
        if (!textModelId) return null;
        const model = await this.aiModelService.findOne({
            where: { id: textModelId, isActive: true },
            relations: ["provider"],
        });
        return model?.provider ? model : null;
    }
}
