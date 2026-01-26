import type { ModelType } from "@buildingai/ai-sdk";

import { AppEntity } from "../decorators/app-entity.decorator";
import { NormalizeFileUrl } from "../decorators/file-url.decorator";
import { Column, Index, OneToMany, type Relation } from "../typeorm";
import { AiModel } from "./ai-model.entity";
import { BaseEntity } from "./base";

/**
 * AI供应商配置实体
 *
 * 管理AI供应商的认证信息和基础配置
 * 一个供应商可以有多个模型
 */
@AppEntity({ name: "ai_providers", comment: "AI供应商配置" })
@Index(["provider"], { unique: true })
export class AiProvider extends BaseEntity {
    /**
     * 供应商标识
     * 例如：openai, deepseek, doubao, qwen, anthropic
     */
    @Column({
        type: "varchar",
        length: 50,
        unique: true,
        comment: "供应商唯一标识",
    })
    provider: string;

    /**
     * 供应商显示名称
     * 例如：OpenAI, DeepSeek, 字节豆包, 阿里通义千问
     */
    @Column({
        type: "varchar",
        length: 100,
        comment: "供应商显示名称",
    })
    name: string;

    /**
     * 供应商描述
     */
    @Column({
        type: "text",
        nullable: true,
        comment: "供应商描述",
    })
    description?: string;

    /**
     * 绑定的密钥配置
     */
    @Column({
        type: "varchar",
        length: 500,
        nullable: true,
        comment: "绑定的密钥配置",
    })
    bindSecretId?: string;

    /**
     * 供应商图标URL
     */
    @Column({
        type: "varchar",
        length: 500,
        nullable: true,
        comment: "供应商图标URL",
    })
    @NormalizeFileUrl()
    iconUrl?: string;

    /**
     * 供应商官网URL
     */
    @Column({
        type: "varchar",
        length: 500,
        nullable: true,
        comment: "供应商官网URL",
    })
    websiteUrl?: string;

    /**
     * 支持的模型分类
     */
    @Column({
        type: "text",
        array: true,
        default: () => "'{}'",
        comment: "支持的模型分类",
    })
    supportedModelTypes: ModelType[];

    /**
     * 是否启用该供应商
     */
    @Column({
        type: "boolean",
        default: true,
        comment: "是否启用该供应商",
    })
    isActive: boolean;

    /**
     * 是否系统内置
     */
    @Column({
        type: "boolean",
        default: false,
        comment: "是否系统内置",
    })
    isBuiltIn: boolean;

    /**
     * 排序权重
     */
    @Column({
        type: "integer",
        default: 0,
        comment: "排序权重，数字越小越靠前",
    })
    sortOrder: number;

    /**
     * 关联的模型列表
     */
    @OneToMany(() => AiModel, (model) => model.provider)
    models: Relation<AiModel[]>;
}
