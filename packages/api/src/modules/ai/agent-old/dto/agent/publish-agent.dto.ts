import { Transform, Type } from "class-transformer";
import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";

/**
 * 发布配置DTO
 */
export class PublishConfigDto {
    /**
     * 允许的域名列表
     */
    @IsOptional()
    @IsArray({ message: "允许的域名必须是数组" })
    @IsString({ each: true, message: "域名必须是字符串" })
    allowOrigins?: string[];

    /**
     * 每分钟请求限制
     */
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    rateLimitPerMinute?: number;

    /**
     * 是否显示品牌信息
     */
    @IsOptional()
    @IsBoolean({ message: "显示品牌信息必须是布尔值" })
    showBranding?: boolean;

    /**
     * 是否允许下载历史记录
     */
    @IsOptional()
    @IsBoolean({ message: "允许下载历史记录必须是布尔值" })
    allowDownloadHistory?: boolean;
}

/**
 * 发布智能体DTO
 */
export class PublishAgentDto {
    /**
     * 发布配置
     */
    @IsOptional()
    @ValidateNested()
    @Type(() => PublishConfigDto)
    publishConfig?: PublishConfigDto;
}

/**
 * 公开智能体信息响应DTO
 */
export class PublicAgentInfoDto {
    /**
     * 智能体ID
     */
    @IsUUID(4, { message: "智能体ID格式不正确" })
    id: string;

    /**
     * 智能体名称
     */
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
     * 开场问题
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
    formFields?: any[];

    /**
     * 快捷指令
     */
    @IsOptional()
    @IsArray({ message: "快捷指令必须是数组" })
    quickCommands?: any[];

    /**
     * 发布配置
     */
    @IsOptional()
    publishConfig?: PublishConfigDto;
}
