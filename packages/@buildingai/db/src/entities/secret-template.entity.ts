import { BooleanNumber, type BooleanNumberType } from "@buildingai/constants";

import { AppEntity } from "../decorators/app-entity.decorator";
import { NormalizeFileUrl } from "../decorators/file-url.decorator";
import { Column, OneToMany, type Relation } from "../typeorm";
import { BaseEntity } from "./base";
import { Secret } from "./secret.entity";

/**
 * 密钥模板类型枚举
 */
export enum SecretTemplateType {
    SYSTEM = "system", // 系统模板
    CUSTOM = "custom", // 自定义模板
}

/**
 * 字段类型枚举
 */
export enum FieldType {
    TEXT = "text", // 文本
    TEXTAREA = "textarea", // 文本域
    NUMBER = "number", // 数字
}

/**
 * 模板字段配置接口
 */
export interface TemplateField {
    /** 字段名称 */
    name: string;
    /** 字段类型 */
    type: FieldType;
    /** 是否必填 */
    required: boolean;
    /** 占位符 */
    placeholder?: string;
}

/**
 * 密钥模板实体
 */
@AppEntity({ name: "secret_template", comment: "密钥模板" })
export class SecretTemplate extends BaseEntity {
    /**
     * 模板名称
     */
    @Column({ length: 100, comment: "模板名称" })
    name: string;

    /**
     * 模板图标
     */
    @Column({ length: 200, nullable: true, comment: "模板图标" })
    @NormalizeFileUrl()
    icon?: string;

    /**
     * 字段配置
     */
    @Column({
        type: "json",
        comment: "模板字段配置，JSON格式存储字段定义",
    })
    fieldConfig: TemplateField[];

    /**
     * 启用状态
     */
    @Column({
        type: "integer",
        default: BooleanNumber.YES,
        comment: "是否启用，1-启用，0-禁用",
    })
    isEnabled: BooleanNumberType;

    /**
     * 排序权重
     */
    @Column({ default: 0, comment: "排序权重，数值越大越靠前" })
    sortOrder: number;

    /**
     * 关联的密钥配置
     */
    @OneToMany(() => Secret, (Secret) => Secret.template)
    Secrets: Relation<Secret[]>;
}
