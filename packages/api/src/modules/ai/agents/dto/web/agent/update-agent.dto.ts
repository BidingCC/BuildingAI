import type {
    AnnotationConfig,
    AutoQuestionsConfig,
    ContextConfig,
    FormFieldConfig,
    ModelConfig,
    ModelRouting,
    QuickCommandConfig,
    ThirdPartyIntegrationConfig,
    ToolConfig,
    VoiceConfig,
} from "@buildingai/types/ai/agent-config.interface";
import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsIn,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
    ValidateNested,
} from "class-validator";

export class MemoryConfigDto {
    @IsOptional()
    @IsInt()
    @Min(1, { message: "maxUserMemories 需在 1～200 之间" })
    @Max(200, { message: "maxUserMemories 需在 1～200 之间" })
    maxUserMemories?: number;

    @IsOptional()
    @IsInt()
    @Min(1, { message: "maxAgentMemories 需在 1～200 之间" })
    @Max(200, { message: "maxAgentMemories 需在 1～200 之间" })
    maxAgentMemories?: number;
}

export class UpdateAgentDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    avatar?: string;

    @IsOptional()
    @IsIn(["direct", "coze", "dify"])
    createMode?: "direct" | "coze" | "dify";

    @IsOptional()
    @IsObject()
    thirdPartyIntegration?: ThirdPartyIntegrationConfig;

    @IsOptional()
    @IsArray()
    @IsUUID("4", { each: true })
    tagIds?: string[];

    @IsOptional()
    @IsString()
    chatAvatar?: string;

    @IsOptional()
    @IsString()
    rolePrompt?: string;

    @IsOptional()
    @IsBoolean()
    showContext?: boolean;

    @IsOptional()
    @IsBoolean()
    showReference?: boolean;

    @IsOptional()
    @IsBoolean()
    chatAvatarEnabled?: boolean;

    @IsOptional()
    @IsBoolean()
    enableFileUpload?: boolean;

    @IsOptional()
    @IsBoolean()
    enableWebSearch?: boolean;

    @IsOptional()
    @IsObject()
    modelConfig?: ModelConfig;

    @IsOptional()
    @IsString()
    openingStatement?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    openingQuestions?: string[];

    @IsOptional()
    @IsArray()
    quickCommands?: QuickCommandConfig[];

    @IsOptional()
    @IsObject()
    autoQuestions?: AutoQuestionsConfig;

    @IsOptional()
    @IsArray()
    formFields?: FormFieldConfig[];

    @IsOptional()
    @IsObject()
    formFieldsInputs?: Record<string, unknown>;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    datasetIds?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    mcpServerIds?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    skillIds?: string[];

    @IsOptional()
    @ValidateNested()
    @Type(() => MemoryConfigDto)
    memoryConfig?: MemoryConfigDto;

    @IsOptional()
    @IsObject()
    modelRouting?: ModelRouting;

    @IsOptional()
    @IsObject()
    contextConfig?: ContextConfig;

    @IsOptional()
    @IsObject()
    voiceConfig?: VoiceConfig;

    @IsOptional()
    @IsObject()
    toolConfig?: ToolConfig;

    @IsOptional()
    @IsObject()
    annotationConfig?: AnnotationConfig;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(50)
    maxSteps?: number;
}
