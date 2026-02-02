import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from "class-validator";

import { IsThirdPartyIntegrationValid } from "../../validators/third-party-integration.validator";
import {
    AgentConfigBaseDto,
    FormFieldConfigDto,
    ThirdPartyIntegrationConfigDto,
} from "./common-agent.dto";

/**
 * 更新智能体配置DTO
 * 包含所有可配置的字段
 */
export class UpdateAgentConfigDto extends AgentConfigBaseDto {
    /**
     * 智能体名称
     */
    @IsOptional()
    @IsString({ message: "智能体名称必须是字符串" })
    name?: string;

    /**
     * 智能体描述
     */
    @IsOptional()
    @IsString({ message: "智能体描述必须是字符串" })
    description?: string;

    /**
     * 智能体头像
     */
    @IsOptional()
    @IsString({ message: "智能体头像必须是字符串" })
    avatar?: string;

    /**
     * 对话头像
     */
    @IsOptional()
    @IsString({ message: "对话头像必须是字符串" })
    chatAvatar?: string;

    /**
     * 开场白
     */
    @IsOptional()
    @IsString({ message: "开场白必须是字符串" })
    openingStatement?: string;

    /**
     * 开场问题配置
     */
    @IsOptional()
    @IsArray({ message: "开场问题必须是数组" })
    @IsString({ each: true, message: "开场问题必须是字符串" })
    openingQuestions?: string[];

    /**
     * 表单字段配置
     */
    @IsOptional()
    @IsArray({ message: "表单字段配置必须是数组" })
    @ValidateNested({ each: true })
    @Type(() => FormFieldConfigDto)
    formFields?: FormFieldConfigDto[];

    /**
     * 表单字段输入值（用于预览和测试）
     */
    @IsOptional()
    formFieldsInputs?: Record<string, any>;

    /**
     * 是否公开
     */
    @IsOptional()
    @IsBoolean({ message: "是否公开必须是布尔值" })
    isPublic?: boolean;

    /**
     * 创建模式
     */
    @IsOptional()
    createMode?: string;

    /**
     * 第三方平台集成配置
     */
    @IsOptional()
    @IsThirdPartyIntegrationValid()
    @ValidateNested()
    @Type(() => ThirdPartyIntegrationConfigDto)
    thirdPartyIntegration?: ThirdPartyIntegrationConfigDto;

    /**
     * 标签ID列表
     */
    @IsOptional()
    @IsArray({ message: "标签ID列表必须是数组" })
    @IsString({ each: true, message: "每个标签ID必须为字符串" })
    tagIds?: string[];
}
