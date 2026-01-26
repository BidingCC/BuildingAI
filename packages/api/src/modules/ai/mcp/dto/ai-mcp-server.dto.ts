import { McpCommunicationType, McpServerType } from "@buildingai/db/entities";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { isEnabled } from "@buildingai/utils";
import { PartialType } from "@nestjs/mapped-types";
import { Transform, Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
    ValidateNested,
} from "class-validator";

/**
 * 创建 MCP 服务的 DTO
 */
export class CreateAiMcpServerDto {
    /**
     * 服务名称
     */
    @IsNotEmpty({ message: "服务名称不能为空" })
    @IsString({ message: "服务名称必须是字符串" })
    name: string;

    /**
     * 服务别名
     */
    @IsOptional()
    @IsString({ message: "服务别名必须是字符串" })
    alias?: string;

    /**
     * 服务描述
     */
    @IsOptional()
    @IsString({ message: "服务描述必须是字符串" })
    description?: string;

    /**
     * 图标
     */
    @IsOptional()
    @IsString({ message: "图标必须是字符串" })
    icon?: string;

    /**
     * 服务类型
     */
    @IsOptional()
    @IsEnum(McpServerType, { message: "服务类型必须是user或者system" })
    type?: McpServerType;

    /**
     * 通信传输方式
     */
    @IsOptional()
    @IsNotEmpty({ message: "通信传输方式不能为空" })
    @IsEnum(McpCommunicationType, { message: "通信传输方式必须是sse或者streamable-http" })
    communicationType?: McpCommunicationType;

    /**
     * 服务SSE URL
     */
    @IsNotEmpty({ message: "SSE URL不能为空" })
    @IsString({ message: "SSE URL必须是字符串" })
    url: string;

    /**
     * 是否禁用该服务
     */
    @IsOptional()
    @IsBoolean({ message: "isDisabled必须是布尔值" })
    isDisabled?: boolean;

    /**
     * 是否快捷菜单
     */
    @IsOptional()
    @IsBoolean({ message: "isQuickMenu必须是布尔值" })
    isQuickMenu?: boolean;

    /**
     * 供应商图标
     */
    @IsOptional()
    @IsString({ message: "供应商图标必须是字符串" })
    providerIcon?: string;

    /**
     * 供应商名称
     */
    @IsOptional()
    @IsString({ message: "供应商名称必须是字符串" })
    providerName?: string;

    /**
     * 供应商URL
     */
    @IsOptional()
    @IsString({ message: "供应商URL必须是字符串" })
    providerUrl?: string;

    /**
     * 排序权重
     */
    @IsOptional()
    @IsInt({ message: "排序权重必须是整数" })
    @Min(0, { message: "排序权重不能小于0" })
    @Max(999, { message: "排序权重不能大于999" })
    sortOrder?: number;

    /**
     * 用户ID
     */
    @IsOptional()
    @IsUUID(undefined, { message: "用户ID必须是有效的UUID" })
    userId?: string;

    /**
     * 自定义请求头
     */
    @IsOptional()
    @IsObject({ message: "自定义请求头必须是对象" })
    customHeaders?: Record<string, string>;
}

/**
 * 更新 MCP 服务的 DTO
 */
export class UpdateAiMcpServerDto extends PartialType(CreateAiMcpServerDto) {}

/**
 * 查询 MCP 服务的 DTO
 */
export class QueryAiMcpServerDto extends PaginationDto {
    /**
     * 服务名称（模糊查询）
     */
    @IsOptional()
    @IsString({ message: "服务名称必须是字符串" })
    name?: string;

    /**
     * 是否启用
     *
     * 支持多种形式的输入：true/false、"true"/"false"、1/0、"1"/"0"、"yes"/"no" 等
     */
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined || value === null) return value;
        return isEnabled(value);
    })
    @IsBoolean({ message: "isDisabled必须是布尔值" })
    isDisabled?: boolean;
}

/**
 * 批量删除 MCP 服务的 DTO
 */
export class BatchDeleteAiMcpServerDto {
    /**
     * 要删除的服务ID列表
     */
    @IsNotEmpty({ message: "服务ID列表不能为空" })
    @IsArray({ message: "服务ID列表必须是数组" })
    @IsUUID(undefined, { each: true, message: "服务ID必须是有效的UUID" })
    ids: string[];
}

/**
 * MCP服务URL配置
 */
export class McpServerUrlConfig {
    /**
     * 服务URL
     */
    @IsNotEmpty({ message: "服务URL不能为空" })
    @IsString({ message: "服务URL必须是字符串" })
    url: string;

    /**
     * 通信类型
     */
    @IsNotEmpty({ message: "通信传输方式不能为空" })
    @IsEnum(McpCommunicationType, { message: "通信传输方式必须是sse或者streamable-http" })
    type: McpCommunicationType;

    /**
     * 自定义请求头
     */
    @IsOptional()
    @IsObject({ message: "自定义请求头必须是对象" })
    customHeaders?: Record<string, string>;
}

/**
 * MCP服务配置映射
 */
export class McpServersConfig {
    /**
     * MCP服务配置映射
     */
    @IsNotEmpty({ message: "MCP服务配置不能为空" })
    @IsObject({ message: "MCP服务配置必须是对象" })
    @ValidateNested()
    @Type(() => McpServerUrlConfig)
    mcpServers: Record<string, McpServerUrlConfig>;
}

/**
 * 导入 MCP 服务的 DTO
 */
export class ImportAiMcpServerDto {
    /**
     * MCP服务配置
     */
    @IsNotEmpty({ message: "MCP服务配置不能为空" })
    @IsObject({ message: "MCP服务配置必须是对象" })
    @ValidateNested()
    @Type(() => McpServersConfig)
    mcpServers: Record<string, McpServerUrlConfig>;

    /**
     * 创建者ID
     */
    @IsOptional()
    @IsUUID(undefined, { message: "创建者ID必须是有效的UUID" })
    creatorId?: string;
}

/**
 * 从JSON字符串导入 MCP 服务的 DTO
 */
export class ImportAiMcpServerJsonDto {
    /**
     * JSON字符串
     */
    @IsNotEmpty({ message: "JSON字符串不能为空" })
    @IsString({ message: "JSON字符串必须是字符串" })
    jsonString: string;
}

/**
 * 批量检测MCP服务连通性的DTO
 */
export class BatchCheckMcpConnectionDto {
    /**
     * MCP服务ID列表
     */
    @IsNotEmpty({ message: "MCP服务ID列表不能为空" })
    @IsArray({ message: "MCP服务ID列表必须是数组" })
    @IsUUID(undefined, { each: true, message: "每个MCP服务ID必须是有效的UUID" })
    mcpServerIds: string[];
}
