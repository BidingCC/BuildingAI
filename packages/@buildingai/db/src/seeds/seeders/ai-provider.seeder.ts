import { ModelType } from "@buildingai/ai-sdk";

import { DataSource } from "../../typeorm";
import { AiProvider } from "./../../entities/ai-provider.entity";
import { BaseSeeder } from "./base.seeder";

/**
 * AI provider configuration data structure
 */
interface ProviderConfig {
    provider: string;
    label: string;
    icon_url: string;
    supported_model_types: ModelType[];
    models: any[];
}

/**
 * AI provider seeder
 *
 * Reads and initializes AI provider data from configuration files
 */
export class AiProviderSeeder extends BaseSeeder {
    readonly name = "AiProviderSeeder";
    readonly priority = 50;

    async run(dataSource: DataSource): Promise<void> {
        const repository = dataSource.getRepository(AiProvider);

        try {
            // Read model configuration file
            const modelConfigData = await this.loadConfig<{ configs: ProviderConfig[] }>(
                "model-config.json",
            );

            if (!modelConfigData || !Array.isArray(modelConfigData.configs)) {
                throw new Error("Invalid model-config.json format, missing configs array");
            }

            const providerConfigs = modelConfigData.configs;
            this.logInfo(`Loaded ${providerConfigs.length} provider configurations from file`);

            let createdCount = 0;
            let updatedCount = 0;

            // Iterate over provider configurations
            for (const config of providerConfigs) {
                // Check whether the provider already exists
                let provider = await repository.findOne({
                    where: { provider: config.provider },
                });

                // Prepare provider payload
                const providerData = {
                    provider: config.provider,
                    name: config.label,
                    iconUrl: config.icon_url,
                    isBuiltIn: true,
                    isActive: false,
                    supportedModelTypes: config.supported_model_types,
                    sortOrder: 0,
                };

                // Create a new provider when none exists
                if (!provider) {
                    provider = await repository.save(providerData);
                    this.logInfo(`Created AI provider: ${provider.name}`);
                    createdCount++;
                } else {
                    await repository.update(provider.id, providerData);
                    this.logInfo(`Updated AI provider: ${provider.name}`);
                    updatedCount++;
                }
            }

            this.logSuccess(
                `AI providers initialized: created ${createdCount}, updated ${updatedCount}`,
            );
        } catch (error) {
            this.logError(`AI provider initialization failed: ${error.message}`);
            throw error;
        }
    }
}
