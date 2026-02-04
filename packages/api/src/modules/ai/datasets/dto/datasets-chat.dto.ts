import { PaginationDto } from "@buildingai/dto/pagination.dto";
import type { UIMessage } from "ai";
import { Type } from "class-transformer";
import {
    IsArray,
    IsEnum,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
    ValidateIf,
    ValidateNested,
} from "class-validator";

export enum DatasetsConversationStatus {
    ACTIVE = "active",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
}

export class CreateDatasetsChatRecordDto {
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    summary?: string;

    @IsOptional()
    @IsUUID()
    modelId?: string;

    @IsOptional()
    @IsObject()
    config?: Record<string, any>;
}

export class UpdateDatasetsChatRecordDto {
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    summary?: string;

    @IsOptional()
    @IsEnum(DatasetsConversationStatus)
    status?: DatasetsConversationStatus;

    @IsOptional()
    @IsObject()
    config?: Record<string, any>;
}

export class QueryDatasetsChatRecordDto extends PaginationDto {
    @IsOptional()
    @IsEnum(DatasetsConversationStatus)
    status?: DatasetsConversationStatus;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    keyword?: string;
}

export class TokenUsageDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    inputTokens?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    outputTokens?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    totalTokens?: number;

    @IsOptional()
    @IsObject()
    inputTokenDetails?: Record<string, number>;

    @IsOptional()
    @IsObject()
    outputTokenDetails?: Record<string, number>;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    reasoningTokens?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    cachedInputTokens?: number;

    @IsOptional()
    @IsObject()
    raw?: Record<string, unknown>;
}

export class CreateDatasetsMessageDto {
    @IsUUID()
    modelId: string;

    @IsString()
    @IsUUID()
    conversationId: string;

    @IsObject()
    message: UIMessage;

    @IsOptional()
    @IsUUID()
    parentId?: string;

    @IsOptional()
    @IsString()
    errorMessage?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => TokenUsageDto)
    tokens?: TokenUsageDto;
}

export class UpdateDatasetsMessageDto {
    @IsOptional()
    @IsObject()
    message?: Partial<Pick<UIMessage, "parts" | "metadata">>;

    @IsOptional()
    @IsEnum(["streaming", "completed", "failed"])
    status?: "streaming" | "completed" | "failed";

    @IsOptional()
    @IsString()
    errorMessage?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => TokenUsageDto)
    tokens?: TokenUsageDto;
}

export interface DatasetsChatCompletionParams {
    datasetId: string;
    userId: string;
    conversationId?: string;
    modelId: string;
    messages: import("ai").UIMessage[];
    title?: string;
    saveConversation?: boolean;
    abortSignal?: AbortSignal;
    isRegenerate?: boolean;
    regenerateMessageId?: string;
    regenerateParentId?: string;
    parentId?: string;
    feature?: Record<string, boolean>;
}

export class DatasetsChatRequestDto {
    @ValidateIf((o) => !o.messages)
    @IsArray()
    messages?: UIMessage[];

    @ValidateIf((o) => !o.messages)
    @IsObject()
    message?: UIMessage;

    @IsUUID(undefined, { message: "模型ID必须为有效 UUID" })
    @IsString()
    modelId: string;

    @IsUUID(4)
    @IsOptional()
    conversationId?: string;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    id?: string;

    @IsOptional()
    trigger?: string;

    @IsOptional()
    messageId?: string;

    @IsOptional()
    @IsString()
    parentId?: string;

    @IsOptional()
    @IsObject()
    feature?: Record<string, boolean>;
}
