import { BooleanNumberType } from "@buildingai/constants";

import { DataSource } from "../../typeorm";
import { SecretTemplate } from "./../../entities/secret-template.entity";
import { BaseSeeder } from "./base.seeder";

/**
 * Secret template configuration data structure
 */
interface SecretTemplateConfig {
    name: string;
    icon: string;
    type: string;
    fieldConfig: any;
    isEnabled: BooleanNumberType;
    sortOrder: number;
}

/**
 * Secret template seeder
 *
 * Reads and initializes secret template data from configuration files
 */
export class SecretTemplateSeeder extends BaseSeeder {
    readonly name = "SecretTemplateSeeder";
    readonly priority = 70;

    async run(dataSource: DataSource): Promise<void> {
        const repository = dataSource.getRepository(SecretTemplate);

        try {
            // Read secret template configuration file
            const templateConfigs =
                await this.loadConfig<SecretTemplateConfig[]>("secret-template.json");

            if (!Array.isArray(templateConfigs)) {
                throw new Error("Invalid secret-template.json format, expected an array");
            }

            this.logInfo(
                `Loaded ${templateConfigs.length} secret template configurations from file`,
            );

            let createdCount = 0;
            let updatedCount = 0;

            // Iterate over each secret template configuration
            for (const templateConfig of templateConfigs) {
                // Determine whether the template already exists (by name)
                let template = await repository.findOne({
                    where: { name: templateConfig.name },
                });

                // Prepare template payload
                const templateData = {
                    name: templateConfig.name,
                    icon: templateConfig.icon,
                    fieldConfig: templateConfig.fieldConfig,
                    isEnabled: templateConfig.isEnabled,
                    sortOrder: templateConfig.sortOrder,
                };

                // Create a new template when none exists
                if (!template) {
                    template = await repository.save(templateData);
                    this.logInfo(`Created secret template: ${template.name}`);
                    createdCount++;
                } else {
                    // Update the template when it already exists
                    await repository.update(template.id, templateData);
                    this.logInfo(`Updated secret template: ${template.name}`);
                    updatedCount++;
                }
            }

            this.logSuccess(
                `Secret templates initialized: created ${createdCount}, updated ${updatedCount}`,
            );
        } catch (error) {
            this.logError(`Secret template initialization failed: ${error.message}`);
            throw error;
        }
    }
}
