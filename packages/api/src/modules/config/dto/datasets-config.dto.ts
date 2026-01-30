import { Type } from "class-transformer";
import {
    IsBoolean,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from "class-validator";

export class WeightConfigDto {
    @IsOptional()
    @IsNumber()
    semanticWeight?: number;

    @IsOptional()
    @IsNumber()
    keywordWeight?: number;
}

export class RerankConfigDto {
    @IsOptional()
    @IsBoolean()
    enabled?: boolean;

    @IsOptional()
    @IsString()
    modelId?: string;
}

export class RetrievalConfigDto {
    @IsOptional()
    @IsString()
    retrievalMode?: string;

    @IsOptional()
    @IsString()
    strategy?: string;

    @IsOptional()
    @IsNumber()
    topK?: number;

    @IsOptional()
    @IsNumber()
    scoreThreshold?: number;

    @IsOptional()
    @IsBoolean()
    scoreThresholdEnabled?: boolean;

    @IsOptional()
    @ValidateNested()
    @Type(() => WeightConfigDto)
    weightConfig?: WeightConfigDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => RerankConfigDto)
    rerankConfig?: RerankConfigDto;
}

export class UpdateDatasetsConfigDto {
    @IsOptional()
    @IsNumber()
    @Min(1)
    initialStorageMb?: number;

    @IsOptional()
    @IsString()
    embeddingModelId?: string;

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => RetrievalConfigDto)
    defaultRetrievalConfig?: RetrievalConfigDto;
}
