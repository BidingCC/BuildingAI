import { ModelFeatureType, ModelType } from "@buildingai/ai-sdk";

import { DataSource } from "../../typeorm";
import { AiModel } from "./../../entities/ai-model.entity";
import { AiProvider } from "./../../entities/ai-provider.entity";
import { BaseSeeder } from "./base.seeder";

/**
 * Model configuration data structure
 */
interface ModelConfig {
    model: string;
    label: string;
    model_type: ModelType;
    features: ModelFeatureType[];
    model_properties: {
        context_size?: number;
        [key: string]: any;
    };
    enabled?: boolean;
}

/**
 * Provider configuration data structure
 */
interface ProviderConfig {
    provider: string;
    label: string;
    models: ModelConfig[];
}

/**
 * AI model seeder
 *
 * Reads and initializes AI model data from configuration files
 * Dependency: AiProviderSeeder must execute first
 */
export class AiModelSeeder extends BaseSeeder {
    readonly name = "AiModelSeeder";
    readonly priority = 60;

    async run(dataSource: DataSource): Promise<void> {
        const providerRepository = dataSource.getRepository(AiProvider);
        const modelRepository = dataSource.getRepository(AiModel);

        try {
            // Read model configuration file
            const modelConfigData = await this.loadConfig<{ configs: ProviderConfig[] }>(
                "model-config.json",
            );

            if (!modelConfigData || !Array.isArray(modelConfigData.configs)) {
                throw new Error("Invalid model-config.json format, missing configs array");
            }

            const providerConfigs = modelConfigData.configs;
            let totalCreated = 0;
            let totalUpdated = 0;

            // Iterate over each provider configuration
            for (const config of providerConfigs) {
                // Find provider entry
                const provider = await providerRepository.findOne({
                    where: { provider: config.provider },
                });

                if (!provider) {
                    this.logWarn(
                        `Provider ${config.provider} does not exist, skipping model initialization`,
                    );
                    continue;
                }

                // Process all models for the provider
                for (const modelConfig of config.models) {
                    // Check whether the model already exists
                    let model = await modelRepository.findOne({
                        where: {
                            providerId: provider.id,
                            model: modelConfig.model,
                        },
                    });

                    // Transform model_properties to frontend-compatible array format
                    // Frontend expects: [{ field, title, description, value, enable }]
                    const transformedModelConfig: Array<any> = [];

                    if (modelConfig.model_properties) {
                        Object.keys(modelConfig.model_properties).forEach((key) => {
                            const value = modelConfig.model_properties[key];
                            transformedModelConfig.push({
                                field: key,
                                title: key,
                                description: key,
                                value: value,
                                enable: true,
                            });
                        });
                    }

                    // Prepare model payload
                    const modelData: Partial<AiModel> = {
                        providerId: provider.id,
                        name: modelConfig.label,
                        model: modelConfig.model,
                        modelType: modelConfig.model_type,
                        features: Array.isArray(modelConfig.features) ? modelConfig.features : [],
                        isActive: modelConfig.enabled === true,
                        isBuiltIn: true,
                        sortOrder: 0,
                        modelConfig: transformedModelConfig as any,
                    };

                    // Create a new model when none exists
                    if (!model) {
                        model = await modelRepository.save(modelData);
                        totalCreated++;
                    } else {
                        await modelRepository.update(model.id, modelData);
                        totalUpdated++;
                    }
                }
            }

            this.logSuccess(
                `AI models initialized: created ${totalCreated}, updated ${totalUpdated}`,
            );
        } catch (error) {
            this.logError(`AI model initialization failed: ${error.message}`);
            throw error;
        }
    }
}
