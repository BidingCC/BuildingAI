import { ModelType } from "@buildingai/ai-sdk";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { isEnabled } from "@buildingai/utils";
import { PartialType } from "@nestjs/mapped-types";
import { Transform, Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsDefined,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
    Min,
    MinLength,
    ValidateIf,
} from "class-validator";

/**
 * 创建AI供应商DTO
 */
export class CreateAiProviderDto {
    /**
     * 供应商唯一标识
     * 例如：openai, deepseek, doubao, qwen, anthropic
     */
    @IsDefined({ message: "供应商标识参数必须传递" })
    @IsNotEmpty({ message: "供应商标识不能为空" })
    @IsString({ message: "供应商标识必须是字符串" })
    @MinLength(1, { message: "供应商标识至少需要2个字符" })
    @MaxLength(50, { message: "供应商标识不能超过50个字符" })
    provider: string;

    /**
     * 供应商显示名称
     * 例如：OpenAI, DeepSeek, 字节豆包, 阿里通义千问
     */
    @IsDefined({ message: "供应商名称参数必须传递" })
    @IsNotEmpty({ message: "供应商名称不能为空" })
    @IsString({ message: "供应商名称必须是字符串" })
    @MinLength(1, { message: "供应商名称不能为空" })
    @MaxLength(100, { message: "供应商名称不能超过100个字符" })
    name: string;

    /**
     * 供应商描述
     */
    @IsOptional()
    @IsString({ message: "供应商描述必须是字符串" })
    @MaxLength(1000, { message: "供应商描述不能超过1000个字符" })
    description?: string;

    /**
     * 绑定的密钥配置
     */
    @IsString({ message: "绑定的密钥配置必须是字符串" })
    bindSecretId: string;

    /**
     * 支持的模型类型
     */
    @IsArray({ message: "支持的模型类型必须是数组" })
    @IsOptional()
    @Type(() => String)
    @IsString({ each: true, message: "支持的模型类型必须是字符串数组" })
    supportedModelTypes?: ModelType[];

    /**
     * 供应商图标URL
     */
    @IsOptional()
    iconUrl?: string;

    /**
     * 是否启用该供应商
     */
    @IsOptional()
    @IsBoolean({ message: "启用状态必须是布尔值" })
    isActive?: boolean;

    /**
     * 排序权重，数字越小越靠前
     */
    @IsOptional()
    @IsNumber({}, { message: "排序权重必须是数字" })
    @Min(0, { message: "排序权重不能小于0" })
    sortOrder?: number;
}

/**
 * 更新AI供应商DTO
 */
export class UpdateAiProviderDto extends PartialType(CreateAiProviderDto) {}

/**
 * AI供应商响应DTO
 */
export class AiProviderResponseDto {
    id: string;
    provider: string;
    name: string;
    baseUrl: string;
    iconUrl?: string;
    isActive: boolean;
    description?: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    modelsCount?: number;
}

/**
 * AI供应商列表查询DTO
 */
export class AiProviderListDto extends PaginationDto {
    /**
     * 供应商标识搜索关键词
     */
    @IsOptional()
    @IsString({ message: "供应商标识搜索关键词必须是字符串" })
    provider?: string;

    /**
     * 供应商名称搜索关键词
     */
    @IsOptional()
    @IsString({ message: "供应商名称搜索关键词必须是字符串" })
    name?: string;

    /**
     * 是否启用
     */
    @IsOptional()
    @IsBoolean({ message: "启用状态必须是布尔值" })
    isActive?: boolean;
}

/**
 * 批量操作供应商DTO
 */
export class BatchProviderOperationDto {
    @IsDefined({ message: "供应商ID列表参数必须传递" })
    @IsNotEmpty({ message: "供应商ID列表不能为空" })
    @IsArray({ message: "供应商ID列表必须是数组" })
    @IsString({ each: true, message: "供应商ID必须是字符串" })
    providerIds: string[];
}

/**
 * 启用/禁用供应商DTO
 */
export class ToggleProviderStatusDto extends BatchProviderOperationDto {
    @IsDefined({ message: "启用状态参数必须传递" })
    @IsBoolean({ message: "启用状态必须是布尔值" })
    isActive: boolean;
}

/**
 * AI供应商查询DTO
 * @description 用于查询AI供应商的参数，不再使用分页
 */
export class QueryAiProviderDto {
    /**
     * 搜索关键词（供应商名称、标识符或描述）
     */
    @IsOptional()
    @IsString({ message: "搜索关键词必须是字符串" })
    keyword?: string;

    /**
     * 是否启用
     */
    @IsOptional()
    @IsBoolean({ message: "启用状态必须是布尔值" })
    @Transform(({ value }) => {
        if (value === undefined || value === null) return value;
        return isEnabled(value);
    })
    isActive?: boolean;

    /**
     * 支持的模型类型
     */
    @IsArray({ message: "支持的模型类型必须是数组" })
    @IsOptional()
    @Type(() => String)
    @IsString({ each: true, message: "支持的模型类型必须是字符串数组" })
    supportedModelTypes?: ModelType[];
}
