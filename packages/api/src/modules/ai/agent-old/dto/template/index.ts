import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

/**
 * 智能体模板基础信息 DTO
 */
export class TemplateBaseDto {
    /**
     * 模板名称
     */
    @IsNotEmpty({ message: "模板名称不能为空" })
    @IsString({ message: "模板名称必须是字符串" })
    name: string;

    /**
     * 模板描述
     */
    @IsOptional()
    @IsString({ message: "模板描述必须是字符串" })
    description?: string;

    /**
     * 模板分类
     */
    @IsOptional()
    @IsString({ message: "模板分类必须是字符串" })
    category?: string;

    /**
     * 模板标签
     */
    @IsOptional()
    @IsArray({ message: "模板标签必须是数组" })
    @IsString({ each: true, message: "标签必须是字符串" })
    tags?: string[];

    /**
     * 模板图标
     */
    @IsOptional()
    @IsString({ message: "模板图标必须是字符串" })
    icon?: string;

    /**
     * 模板预览图
     */
    @IsOptional()
    @IsString({ message: "模板预览图必须是字符串" })
    previewImage?: string;
}

/**
 * 创建智能体模板 DTO
 */
export class CreateTemplateDto extends TemplateBaseDto {
    /**
     * 模板配置内容
     */
    @IsNotEmpty({ message: "模板配置不能为空" })
    @IsString({ message: "模板配置必须是字符串" })
    config: string;

    /**
     * 是否公开
     */
    @IsOptional()
    @IsBoolean({ message: "是否公开必须是布尔值" })
    isPublic?: boolean;

    /**
     * 创建者ID
     */
    @IsOptional()
    @IsUUID(4, { message: "创建者ID必须是有效的UUID" })
    createBy?: string;
}

/**
 * 更新智能体模板 DTO
 */
export class UpdateTemplateDto extends TemplateBaseDto {
    /**
     * 模板ID
     */
    @IsNotEmpty({ message: "模板ID不能为空" })
    @IsUUID(4, { message: "模板ID必须是有效的UUID" })
    id: string;

    /**
     * 模板配置内容
     */
    @IsOptional()
    @IsString({ message: "模板配置必须是字符串" })
    config?: string;

    /**
     * 是否公开
     */
    @IsOptional()
    @IsBoolean({ message: "是否公开必须是布尔值" })
    isPublic?: boolean;
}

/**
 * 查询智能体模板 DTO
 */
export class QueryTemplateDto {
    /**
     * 页码
     */
    @IsOptional()
    page?: number = 1;

    /**
     * 每页数量
     */
    @IsOptional()
    limit?: number = 10;

    /**
     * 搜索关键词
     */
    @IsOptional()
    @IsString({ message: "搜索关键词必须是字符串" })
    keyword?: string;

    /**
     * 分类筛选
     */
    @IsOptional()
    @IsString({ message: "分类必须是字符串" })
    category?: string;

    /**
     * 分类筛选（复数形式，兼容旧代码）
     */
    @IsOptional()
    @IsString({ message: "分类必须是字符串" })
    categories?: string;

    /**
     * 标签筛选
     */
    @IsOptional()
    @IsString({ message: "标签必须是字符串" })
    tag?: string;

    /**
     * 标签筛选（复数形式，兼容旧代码）
     */
    @IsOptional()
    @IsArray({ message: "标签必须是数组" })
    @IsString({ each: true, message: "标签必须是字符串" })
    tags?: string[];

    /**
     * 是否公开筛选
     */
    @IsOptional()
    @IsBoolean({ message: "是否公开必须是布尔值" })
    isPublic?: boolean;

    /**
     * 是否推荐筛选
     */
    @IsOptional()
    @IsBoolean({ message: "是否推荐必须是布尔值" })
    recommended?: boolean;

    /**
     * 排序方式
     */
    @IsOptional()
    @IsString({ message: "排序方式必须是字符串" })
    sortBy?: "popular" | "latest" | "name";

    /**
     * 排序顺序
     */
    @IsOptional()
    @IsString({ message: "排序顺序必须是字符串" })
    sortOrder?: "asc" | "desc";
}

/**
 * 智能体模板响应 DTO
 */
export class TemplateResponseDto {
    /**
     * 模板ID
     */
    id: string;

    /**
     * 模板名称
     */
    name: string;

    /**
     * 模板描述
     */
    description?: string;

    /**
     * 模板分类
     */
    category?: string;

    /**
     * 模板分类（复数形式，兼容旧代码）
     */
    categories?: string;

    /**
     * 模板标签
     */
    tags?: string[];

    /**
     * 模板图标
     */
    icon?: string;

    /**
     * 模板预览图
     */
    previewImage?: string;

    /**
     * 模板配置内容
     */
    config: string;

    /**
     * 是否公开
     */
    isPublic: boolean;

    /**
     * 是否推荐
     */
    isRecommended?: boolean;

    /**
     * 使用次数
     */
    usageCount: number;

    /**
     * 知识库ID列表
     */
    datasetIds?: string[];

    /**
     * 创建者ID
     */
    createBy: string;

    /**
     * 创建时间
     */
    createdAt: Date;

    /**
     * 更新时间
     */
    updatedAt: Date;
}

/**
 * 应用模板到智能体 DTO
 */
export class ApplyTemplateDto {
    /**
     * 模板ID
     */
    @IsNotEmpty({ message: "模板ID不能为空" })
    @IsUUID(4, { message: "模板ID必须是有效的UUID" })
    templateId: string;

    /**
     * 目标智能体ID
     */
    @IsOptional()
    @IsUUID(4, { message: "智能体ID必须是有效的UUID" })
    agentId?: string;

    /**
     * 是否覆盖现有配置
     */
    @IsOptional()
    @IsBoolean({ message: "是否覆盖必须是布尔值" })
    overwrite?: boolean = false;
}

/**
 * 智能体模板 DTO（别名）
 */
export class AgentTemplateDto extends TemplateResponseDto {}

/**
 * 从模板创建智能体 DTO
 */
export class CreateAgentFromTemplateDto {
    /**
     * 模板ID
     */
    @IsNotEmpty({ message: "模板ID不能为空" })
    templateId: string;

    /**
     * 智能体名称（可选，如果提供则覆盖模板中的名称）
     */
    @IsOptional()
    @IsString({ message: "智能体名称必须是字符串" })
    name?: string;

    /**
     * 智能体描述（可选，如果提供则覆盖模板中的描述）
     */
    @IsOptional()
    @IsString({ message: "智能体描述必须是字符串" })
    description?: string;

    /**
     * 智能体头像（可选，如果提供则覆盖模板中的头像）
     */
    @IsOptional()
    @IsString({ message: "智能体头像必须是字符串" })
    avatar?: string;

    /**
     * 创建者ID
     */
    @IsOptional()
    @IsUUID(4, { message: "创建者ID必须是有效的UUID" })
    createBy?: string;
}

/**
 * 导出智能体 DSL 配置 DTO
 */
export interface ExportAgentDslDto {
    /**
     * 智能体ID
     */
    agentId: string;

    /**
     * DSL 格式（支持 yaml 和 json）
     */
    format?: "yaml" | "json";
}

/**
 * 导入智能体 DSL 配置 DTO
 */
export class ImportAgentDslDto {
    /**
     * DSL 配置内容（YAML 或 JSON 格式字符串）
     */
    @IsNotEmpty({ message: "DSL 配置内容不能为空" })
    @IsString({ message: "DSL 配置内容必须是字符串" })
    content: string;

    /**
     * DSL 格式（支持 yaml 和 json）
     */
    @IsOptional()
    @IsString({ message: "DSL 格式必须是字符串" })
    format?: "yaml" | "json";

    /**
     * 智能体名称（可选，如果不提供则使用 DSL 中的名称）
     */
    @IsOptional()
    @IsString({ message: "智能体名称必须是字符串" })
    name?: string;

    /**
     * 智能体描述（可选，如果不提供则使用 DSL 中的描述）
     */
    @IsOptional()
    @IsString({ message: "智能体描述必须是字符串" })
    description?: string;

    /**
     * 智能体头像（可选，如果不提供则使用 DSL 中的头像）
     */
    @IsOptional()
    @IsString({ message: "智能体头像必须是字符串" })
    avatar?: string;

    /**
     * 创建者ID
     */
    @IsOptional()
    @IsUUID(4, { message: "创建者ID必须是有效的UUID" })
    createBy?: string;
}
