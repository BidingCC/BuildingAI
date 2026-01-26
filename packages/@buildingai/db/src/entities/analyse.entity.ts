import { Column, Index, JoinColumn, ManyToOne } from "typeorm";

import { AppEntity } from "../decorators/app-entity.decorator";
import { BaseEntity } from "./base";
import { User } from "./user.entity";

/**
 * 行为类型枚举
 */
export enum AnalyseActionType {
    /** 页面访问 */
    PAGE_VISIT = "page_visit",
    /** 插件使用 */
    PLUGIN_USE = "plugin_use",
    /** API调用 */
    API_CALL = "api_call",
    /** 其他行为 */
    OTHER = "other",
}

/**
 * 分析统计实体
 *
 * 用于记录各种用户行为，包括访问、插件使用等
 */
@AppEntity({ name: "analyse", comment: "行为分析统计" })
export class Analyse extends BaseEntity {
    /**
     * 用户ID（可为空，支持匿名访问）
     */
    @Column({
        type: "uuid",
        nullable: true,
        comment: "用户ID",
    })
    @Index()
    userId?: string | null;

    /**
     * 用户关联
     */
    @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "userId" })
    user?: User | null;

    /**
     * 行为类型
     */
    @Column({
        type: "enum",
        enum: AnalyseActionType,
        default: AnalyseActionType.PAGE_VISIT,
        comment: "行为类型",
    })
    @Index()
    actionType: AnalyseActionType;

    /**
     * 行为来源/标识
     *
     * 例如：页面路径、插件名称、API路径等
     */
    @Column({
        type: "varchar",
        length: 255,
        nullable: true,
        comment: "行为来源/标识",
    })
    @Index()
    source?: string | null;

    /**
     * IP地址
     */
    @Column({
        type: "varchar",
        length: 45,
        nullable: true,
        comment: "IP地址",
    })
    @Index()
    ipAddress?: string | null;

    /**
     * 用户代理
     */
    @Column({
        type: "text",
        nullable: true,
        comment: "用户代理",
    })
    userAgent?: string | null;

    /**
     * 额外信息（JSON格式）
     *
     * 用于存储额外的行为数据
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "额外信息",
    })
    extraData?: Record<string, any> | null;
}
