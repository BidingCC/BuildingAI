import { RETRIEVAL_MODE } from "@buildingai/constants/shared/datasets.constants";
import type { RetrievalConfig } from "@buildingai/types/ai/retrieval-config.interface";
import { IsIn, IsObject, IsOptional, IsString } from "class-validator";

export class SetDatasetVectorConfigDto {
    @IsOptional()
    @IsString()
    embeddingModelId?: string;

    @IsOptional()
    @IsIn(Object.values(RETRIEVAL_MODE))
    retrievalMode?: string;

    @IsOptional()
    @IsObject()
    retrievalConfig?: RetrievalConfig;
}
