import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

import { ThirdPartyIntegrationConfigDto } from "./common-agent.dto";

/**
 * 创建智能体DTO
 * 只需要基本信息：名称、描述、头像
 */
export class CreateAgentDto {
    /**
     * 智能体名称
     */
    @IsNotEmpty({ message: "智能体名称不能为空" })
    @IsString({ message: "智能体名称必须是字符串" })
    name: string;

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
     * 创建模式
     * - 'direct': 直接创建（默认）
     * - 其他值: 从第三方平台创建
     */
    @IsOptional()
    createMode?: string;

    /**
     * 第三方平台集成配置
     * 当创建模式为第三方平台时必填
     */
    @IsOptional()
    thirdPartyIntegration?: ThirdPartyIntegrationConfigDto;

    /**
     * 创建者ID
     */
    @IsOptional()
    @IsUUID(4, { message: "创建者ID必须是有效的UUID" })
    createBy?: string;

    /**
     * 标签ID列表
     */
    @IsOptional()
    @IsArray({ message: "标签ID列表必须是数组" })
    @IsString({ each: true, message: "每个标签ID必须为字符串" })
    tagIds?: string[];
}

/**
 * 导入智能体DTO
 */
export class ImportAgentDto {
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
    openingQuestions?: string[];

    /**
     * 角色设定
     */
    @IsOptional()
    @IsString({ message: "角色设定必须是字符串" })
    rolePrompt?: string;

    /**
     * 是否显示对话上下文
     */
    @IsOptional()
    showContext?: boolean;

    /**
     * 是否显示引用来源
     */
    @IsOptional()
    showReference?: boolean;

    /**
     * 是否允许反馈
     */
    @IsOptional()
    enableFeedback?: boolean;

    /**
     * 是否开启联网搜索
     */
    @IsOptional()
    enableWebSearch?: boolean;

    /**
     * 是否公开
     */
    @IsOptional()
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
    thirdPartyIntegration?: ThirdPartyIntegrationConfigDto;

    /**
     * 创建者ID
     */
    @IsOptional()
    @IsUUID(4, { message: "创建者ID必须是有效的UUID" })
    createBy?: string;
}
