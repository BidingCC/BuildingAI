import { Adapter, getProvider } from "@buildingai/ai-sdk";
import { ClientOptions } from "@buildingai/ai-sdk/openai";
import { BaseService } from "@buildingai/base";
import { SecretService } from "@buildingai/core/modules";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AiModel, Secret } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

/**
 * Public AI Model Service
 */
@Injectable()
export class PublicAiModelService {
    protected readonly logger = new Logger(PublicAiModelService.name);
    private readonly baseService: BaseService<AiModel>;

    constructor(
        @InjectRepository(AiModel)
        protected readonly aiModelRepository: Repository<AiModel>,
        @InjectRepository(Secret)
        protected readonly secretRepository: Repository<Secret>,
        private readonly secretService: SecretService,
    ) {
        this.baseService = new BaseService(aiModelRepository);
    }

    async getModelInfo(modelId: string) {
        const model = await this.baseService.findOneById(modelId, {
            relations: ["provider"],
        });

        if (!model) {
            throw new Error("The ai model is not found.");
        }

        return model;
    }

    /**
     * Get provider config
     * @param modelId AI model identifier
     * @returns Provider config
     */
    async getProviderConfig(modelId: string) {
        const model = await this.getModelInfo(modelId);

        if (!model.provider.bindSecretId) {
            throw new Error("The ai model is not bound to a secret.");
        }

        const secretConfig = await this.secretService.getConfigKeyValuePairs(
            model.provider.bindSecretId,
        );

        return secretConfig;
    }

    /**
     * Get provider
     * @param modelId AI model identifier
     * @param configKeys Config keys
     * @returns Provider
     */
    async getProviderAdapter(modelId: string, config: ClientOptions = {}): Promise<Adapter> {
        const model = await this.getModelInfo(modelId);
        const provider = getProvider(model.provider.provider, config);
        return provider;
    }
}
