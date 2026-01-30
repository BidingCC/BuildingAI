import {
    PROCESSING_STATUS,
    RETRIEVAL_MODE,
    type RetrievalModeType,
} from "@buildingai/constants/shared/datasets.constants";
import { IndexingSegmentsDto } from "./indexing-segments.dto";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import {
    RerankConfig,
    RetrievalConfig,
    WeightConfig,
} from "@buildingai/types/ai/retrieval-config.interface";
import { Transform, Type } from "class-transformer";
import {
    IsBoolean,
    IsEnum,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
    ValidateNested,
} from "class-validator";

/**
 * 权重配置 DTO（统一的检索参数配置）
 */
export class WeightConfigDto implements WeightConfig {
    /**
     * 语义权重（仅在混合检索模式下使用）
     */
    @IsOptional()
    @IsNumber({}, { message: "语义权重必须是数字" })
    @Min(0, { message: "语义权重不能小于0" })
    @Max(1, { message: "语义权重不能超过1" })
    @Transform(({ value }) => parseFloat(value))
    semanticWeight?: number;

    /**
     * 关键词权重（仅在混合检索模式下使用）
     */
    @IsOptional()
    @IsNumber({}, { message: "关键词权重必须是数字" })
    @Min(0, { message: "关键词权重不能小于0" })
    @Max(1, { message: "关键词权重不能超过1" })
    @Transform(({ value }) => parseFloat(value))
    keywordWeight?: number;
}

/**
 * Rerank模型配置 DTO
 */
export class RerankConfigDto implements RerankConfig {
    /**
     * 是否启用 Rerank
     */
    @IsOptional()
    @IsBoolean({ message: "是否启用Rerank必须是布尔值" })
    @Transform(({ value }) => value === true || value === "true")
    enabled?: boolean = false;

    /**
     * Rerank模型ID
     */
    @IsOptional()
    @IsString({ message: "Rerank模型ID必须是字符串" })
    modelId?: string;
}

/**
 * 检索配置 DTO
 */
export class RetrievalConfigDto implements RetrievalConfig {
    /**
     * 检索模式
     */
    @IsEnum(RETRIEVAL_MODE, {
        message: "检索模式必须是 vector、fullText 或 hybrid",
    })
    retrievalMode: RetrievalModeType;

    /**
     * 混合检索策略（仅在混合模式下使用）
     */
    @IsOptional()
    @IsString({ message: "混合检索策略必须是字符串" })
    @IsIn(["weighted_score", "rerank"], {
        message: "混合检索策略必须是 weighted_score 或 rerank",
    })
    strategy?: "weighted_score" | "rerank";

    /**
     * TopK：筛选与用户问题相似度最高的文本片段
     */
    @IsOptional()
    @IsInt({ message: "TopK必须是整数" })
    @Min(1, { message: "TopK不能小于1" })
    @Max(100, { message: "TopK不能超过100" })
    @Transform(({ value }) => parseInt(value))
    topK?: number = 3;

    /**
     * Score阈值：文本片段筛选的相似度阈值
     */
    @IsOptional()
    @IsNumber({}, { message: "Score阈值必须是数字" })
    @Min(0, { message: "Score阈值不能小于0" })
    @Max(1, { message: "Score阈值不能超过1" })
    @Transform(({ value }) => parseFloat(value))
    scoreThreshold?: number = 0.3;

    /**
     * 是否启用阈值过滤
     */
    @IsOptional()
    @IsBoolean({ message: "是否启用阈值过滤必须是布尔值" })
    @Transform(({ value }) => value === true || value === "true" || value === 1 || value === "1")
    scoreThresholdEnabled?: boolean = true;

    /**
     * 权重配置（仅混合模式使用）
     */
    @IsOptional()
    @ValidateNested()
    @Type(() => WeightConfigDto)
    weightConfig?: WeightConfigDto;

    /**
     * Rerank配置
     */
    @IsOptional()
    @ValidateNested()
    @Type(() => RerankConfigDto)
    rerankConfig?: RerankConfigDto;
}

/**
 * 创建知识库 DTO
 */
export class CreateDatasetDto {
    /**
     * 知识库名称
     */
    @IsString({ message: "知识库名称必须是字符串" })
    @IsNotEmpty({ message: "知识库名称不能为空" })
    name: string;

    /**
     * 知识库描述
     */
    @IsOptional()
    @IsString({ message: "知识库描述必须是字符串" })
    description?: string;

    /**
     * 索引配置
     */
    @ValidateNested()
    @Type(() => IndexingSegmentsDto)
    indexingConfig: IndexingSegmentsDto;

    /**
     * Embedding 模型配置
     */
    @IsString({ message: "Embedding模型ID必须是字符串" })
    @IsNotEmpty({ message: "Embedding模型ID不能为空" })
    embeddingModelId: string;

    /**
     * 检索配置
     */
    @ValidateNested()
    @Type(() => RetrievalConfigDto)
    retrievalConfig: RetrievalConfigDto;
}

/**
 * 查询知识库 DTO
 */
export class QueryDatasetDto extends PaginationDto {
    /**
     * 关键词搜索（知识库名称、描述）
     */
    @IsOptional()
    @IsString({ message: "关键词必须是字符串" })
    keyword?: string;

    /**
     * 是否显示所有知识库
     */
    @IsOptional()
    @IsBoolean({ message: "是否显示所有知识库必须是布尔值" })
    @Transform(({ value }) => value === true || value === "true")
    showAll?: boolean;

    /**
     * 状态筛选
     */
    @IsOptional()
    @IsEnum(PROCESSING_STATUS, { message: "状态必须是有效值" })
    status?: string;

    /**
     * 开始时间
     */
    @IsOptional()
    @IsString({ message: "开始时间必须是字符串" })
    startTime?: string;

    /**
     * 结束时间
     */
    @IsOptional()
    @IsString({ message: "结束时间必须是字符串" })
    endTime?: string;
}

/**
 * 删除知识库 DTO
 */
export class DeleteDatasetDto {
    /**
     * 知识库ID
     */
    @IsUUID("4", { message: "知识库ID格式不正确" })
    @IsNotEmpty({ message: "知识库ID不能为空" })
    id: string;
}

/**
 * 知识库检索查询 DTO
 */
export class QueryKnowledgeDto {
    /**
     * 查询内容
     */
    @IsString({ message: "查询内容必须是字符串" })
    query: string;

    /**
     * TopK设置（可选，覆盖知识库默认配置）
     */
    @IsOptional()
    @IsInt({ message: "TopK必须是整数" })
    @Min(1, { message: "TopK不能小于1" })
    @Max(100, { message: "TopK不能超过100" })
    @Transform(({ value }) => parseInt(value))
    topK?: number;

    /**
     * Score阈值设置（可选，覆盖知识库默认配置）
     */
    @IsOptional()
    @IsNumber({}, { message: "Score阈值必须是数字" })
    @Min(0, { message: "Score阈值不能小于0" })
    @Max(1, { message: "Score阈值不能超过1" })
    @Transform(({ value }) => parseFloat(value))
    scoreThreshold?: number;
}

/**
 * 召回测试 DTO
 */
export class RetrievalTestDto {
    /**
     * 查询内容
     */
    @IsString({ message: "查询内容必须是字符串" })
    @IsNotEmpty({ message: "查询内容不能为空" })
    query: string;

    /**
     * 召回配置（可选，覆盖知识库默认配置）
     */
    @IsOptional()
    @ValidateNested()
    @Type(() => RetrievalConfigDto)
    retrievalConfig?: RetrievalConfigDto;
}

/**
 * 知识库编辑 DTO
 */
export class UpdateDatasetDto {
    /**
     * 知识库名称
     */
    @IsOptional()
    @IsString({ message: "知识库名称必须是字符串" })
    @IsNotEmpty({ message: "知识库名称不能为空" })
    name?: string;

    /**
     * 知识库描述
     */
    @IsOptional()
    @IsString({ message: "知识库描述必须是字符串" })
    description?: string;

    /**
     * Embedding 模型配置
     */
    @IsOptional()
    @IsString({ message: "Embedding模型ID必须是字符串" })
    @IsNotEmpty({ message: "Embedding模型ID不能为空" })
    embeddingModelId?: string;

    /**
     * 检索配置
     */
    @IsOptional()
    @ValidateNested()
    @Type(() => RetrievalConfigDto)
    retrievalConfig?: RetrievalConfigDto;
}
