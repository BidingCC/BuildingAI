/**
 * 支付配置实体
 */
import {
    type PayConfigMap,
    PayConfigPayType,
    type PayConfigType,
} from "@buildingai/constants/shared/payconfig.constant";
/**
 * 支付配置实体
 */
import {
    BooleanNumber,
    type BooleanNumberType,
} from "@buildingai/constants/shared/status-codes.constant";

import { Column } from "../typeorm";
import { AppEntity } from "./../decorators/app-entity.decorator";
import { BaseEntity } from "./base";

@AppEntity({ name: "payconfig", comment: "支付配置" })
export class Payconfig extends BaseEntity {
    /**
     * 支付配置图标
     */
    @Column()
    logo: string;

    /**
     * 是否启用
     */
    @Column({
        type: "enum",
        enum: BooleanNumber,
        comment: "是否启用",
    })
    isEnable: BooleanNumberType;

    /**
     * 是否默认
     */
    @Column({
        type: "enum",
        enum: BooleanNumber,
        comment: "是否默认",
    })
    isDefault: BooleanNumberType;

    /**
     * 支付配置名称
     */
    @Column()
    name: string;

    /**
     * 支付方式
     */
    @Column({
        type: "enum",
        enum: PayConfigPayType,
        comment: "支付方式",
    })
    payType: PayConfigType;

    /**
     * 排序
     */
    @Column({ default: 0 })
    sort: number;

    /**
     * 具体配置
     */
    @Column({ type: "jsonb", nullable: true, comment: "具体支付方式的配置" })
    config: PayConfigMap[PayConfigType] | null;
}
