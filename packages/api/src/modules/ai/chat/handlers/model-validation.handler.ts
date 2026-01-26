import { AiModel } from "@buildingai/db/entities";
import { HttpErrorFactory } from "@buildingai/errors";
import { AiModelService } from "@modules/ai/model/services/ai-model.service";
import { Injectable } from "@nestjs/common";

/**
 * Model Validation Command Handler
 *
 * Handles model retrieval and validation.
 */
@Injectable()
export class ModelValidationCommandHandler {
    constructor(private readonly aiModelService: AiModelService) {}

    /**
     * Get and validate model by ID
     *
     * @param modelId - Model ID
     * @returns Model entity with provider relation
     * @throws HttpErrorFactory.notFound if model not found
     */
    async getAndValidateModel(modelId: string): Promise<AiModel> {
        const model = await this.aiModelService.findOne({
            where: { id: modelId },
            relations: ["provider"],
        });

        if (!model) {
            throw HttpErrorFactory.notFound("Model not found.");
        }

        return model;
    }
}
