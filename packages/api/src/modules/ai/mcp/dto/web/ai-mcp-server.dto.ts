import { McpCommunicationType, McpServerType } from "@buildingai/db/entities";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { isEnabled } from "@buildingai/utils";
import { PartialType } from "@nestjs/mapped-types";
import { Transform, Type } from "class-transformer";
import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    ValidateIf,
    ValidateNested,
} from "class-validator";

import { AddUserMcpServerDto } from "./user-mcp-server.dto";

/**
 * 创建前台 MCP 服务的 DTO
 */
export class CreateWebAiMcpServerDto extends PartialType(AddUserMcpServerDto) {
    /**
     * 服务名称
     */
    @IsNotEmpty({ message: "服务名称不能为空" })
    @IsString({ message: "服务名称必须是字符串" })
    @MaxLength(100, { message: "服务名称长度不能超过100个字符" })
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
    @MaxLength(100, { message: "图标长度不能超过100个字符" })
    icon?: string;

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
     * 环境变量
     */
    @IsOptional()
    @IsObject({ message: "环境变量必须是对象" })
    env?: Record<string, string>;

    /**
     * 供应商名称
     */
    @IsOptional()
    @IsString({ message: "供应商名称必须是字符串" })
    @MaxLength(100, { message: "供应商名称长度不能超过100个字符" })
    providerName?: string;

    /**
     * 供应商URL
     */
    @IsOptional()
    @IsString({ message: "供应商URL必须是字符串" })
    @MaxLength(100, { message: "供应商URL长度不能超过100个字符" })
    providerUrl?: string;

    /**
     * 是否禁用
     */
    @IsOptional()
    @IsBoolean({ message: "是否显示必须是布尔值" })
    isDisabled?: boolean;

    /**
     * 请求头
     */
    @IsOptional()
    @IsObject({ message: "请求头必须是对象" })
    headers?: Record<string, string>;
}

/**
 * 更新前台 MCP 服务的 DTO
 */
export class UpdateWebAiMcpServerDto extends PartialType(CreateWebAiMcpServerDto) {}

/**
 * 切换 MCP 服务状态的 DTO
 */
export class ToggleAiMcpServerStatusDto {
    /**
     * 状态值
     */
    @IsNotEmpty({ message: "状态值不能为空" })
    @IsBoolean({ message: "状态值必须是布尔值" })
    @Transform(({ value }) => (value !== undefined ? isEnabled(value) : true))
    status: boolean;
}

export class QueryAiMcpServerDto extends PaginationDto {
    @IsOptional()
    @IsString({ message: "服务名称必须是字符串" })
    name?: string;

    @IsOptional()
    @Transform(({ value }) => (value !== undefined ? isEnabled(value) : true))
    isDisabled?: boolean;

    @IsOptional()
    @IsEnum(McpServerType)
    @ValidateIf((o) => o.type !== "" && o.type !== undefined && o.type !== null)
    type?: McpServerType;
}

export class QueryAiSystemMcpServerDto extends PaginationDto {
    @IsOptional()
    @IsString({ message: "服务名称必须是字符串" })
    name?: string;

    @IsOptional()
    @Transform(({ value }) => (value !== undefined ? isEnabled(value) : true))
    isAssociated?: boolean;
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
    @Type(() => WebMcpServerUrlConfig)
    mcpServers: Record<string, WebMcpServerUrlConfig>;
}

/**
 * MCP服务URL配置
 */
export class WebMcpServerUrlConfig {
    /**
     * 服务URL
     */
    @IsNotEmpty({ message: "服务URL不能为空" })
    @IsString({ message: "服务URL必须是字符串" })
    url: string;

    /**
     * 请求头
     */
    @IsOptional()
    @IsObject({ message: "请求头必须是对象" })
    headers?: Record<string, string>;

    /**
     * 通信传输方式
     */
    @IsNotEmpty({ message: "通信传输方式" })
    @IsString({ message: "通信传输方式必须是字符串" })
    type: McpCommunicationType;
}

/**
 * 导入 MCP 服务的 DTO
 */
export class ImportWebAiMcpServerDto {
    /**
     * MCP服务配置
     */
    @IsNotEmpty({ message: "MCP服务配置不能为空" })
    @IsObject({ message: "MCP服务配置必须是对象" })
    @ValidateNested()
    @Type(() => McpServersConfig)
    mcpServers: Record<string, WebMcpServerUrlConfig>;

    /**
     * 创建者ID
     */
    @IsOptional()
    @IsUUID(undefined, { message: "创建者ID必须是有效的UUID" })
    creatorId?: string;
}

/**
 * 前台导入MCP服务的JSON DTO
 */
export class ImportWebAiMcpServerJsonDto {
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
    @IsUUID(undefined, { each: true, message: "每个MCP服务ID必须是有效的UUID" })
    mcpServerIds: string[];
}
