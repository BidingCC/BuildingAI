import type { ModelFeatureType, ModelType } from "@buildingai/ai-sdk";

import { AppEntity } from "../decorators/app-entity.decorator";
import {
    Column,
    Index,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    type Relation,
} from "../typeorm";
import { AiProvider } from "./ai-provider.entity";
import { BaseEntity } from "./base";
import { MembershipLevels } from "./membership-levels.entity";

/**
 * AI模型配置实体
 *
 * 用于存储具体AI模型的配置信息
 * 认证信息由关联的AiProvider提供
 */
@AppEntity({
    name: "ai_models",
    comment: "AI模型配置",
})
@Index(["providerId", "model"])
export class AiModel extends BaseEntity {
    /**
     * 模型显示名称
     * 例如：ChatGPT-4, DeepSeek Chat, 豆包等
     */
    @Column({
        type: "varchar",
        length: 100,
        comment: "模型显示名称",
    })
    name: string;

    /**
     * 模型标识符
     * 例如：gpt-4, deepseek-chat, doubao-lite
     */
    @Column({
        type: "varchar",
        length: 100,
        comment: "模型在供应商API中的标识符",
    })
    model: string;

    /**
     * 模型类型
     */
    @Column({
        type: "varchar",
        length: 100,
        comment: "模型类型",
    })
    modelType: ModelType;

    /**
     * 供应商ID
     */
    @Column({
        type: "uuid",
        comment: "关联的供应商ID",
    })
    @Index()
    providerId: string;

    /**
     * 模型特性
     */
    @Column({
        type: "jsonb",
        default: () => "'[]'",
        comment: "模型特性",
    })
    features?: ModelFeatureType[];

    /**
     * 最大上下文条数
     */
    @Column({
        type: "integer",
        nullable: true,
        default: 5,
        comment: "上下文条数",
    })
    maxContext?: number;

    /**
     * 模型特定配置
     * 用于存储模型级别的特定配置参数
     */
    @Column({
        type: "jsonb",
        default: () => "'[]'",
        comment: "模型特定配置信息",
    })
    modelConfig: Record<string, any>[];

    /**
     * 是否启用该模型
     */
    @Column({
        type: "boolean",
        default: true,
        comment: "是否启用该模型",
    })
    isActive: boolean;

    /**
     * 模型描述
     */
    @Column({
        type: "text",
        nullable: true,
        comment: "模型描述",
    })
    description?: string;

    /**
     * 排序权重
     */
    @Column({
        type: "integer",
        default: 0,
        comment: "排序权重，数字越大越靠前",
    })
    sortOrder: number;

    /**
     * 模型计费规则
     */
    @Column({
        type: "jsonb",
        nullable: false,
        comment: "计费规则",
        default: { power: 0, tokens: 1000 },
    })
    billingRule: { power: number; tokens: number };

    /**
     * 会员等级
     */
    @Column({
        type: "jsonb",
        default: () => "'[]'",
        comment: "会员等级",
    })
    membershipLevel: string[];

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
     * 关联的供应商
     */
    @ManyToOne(() => AiProvider, (provider) => provider.models, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "provider_id" })
    provider: Relation<AiProvider>;

    /**
     * 关联会员等级
     */
    @ManyToMany(() => MembershipLevels, (membershipLevel) => membershipLevel.aiModels)
    @JoinTable({
        name: "model_membership_levels", // 关联表名
        joinColumn: { name: "model_id", referencedColumnName: "id" }, // 在中间表中指定模型表的外键
        inverseJoinColumn: { name: "level_id", referencedColumnName: "id" }, // 在中间表中指定会员等级表的外键
    })
    membershipLevels: MembershipLevels[];
}
