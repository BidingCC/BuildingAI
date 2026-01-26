import { Column } from "typeorm";

import { AppEntity } from "../decorators/app-entity.decorator";
import { BaseEntity } from "./base";

export enum MembershipPlanDuration {
    MONTH = 1,
    QUARTER = 2,
    HALF = 3,
    YEAR = 4,
    FOREVER = 5,
    CUSTOM = 6,
}

export interface Duration {
    value: number;
    unit: string;
}

export interface Billing {
    levelId: string;
    salesPrice: number;
    originalPrice?: number;
    label?: string;
    status: boolean;
}

@AppEntity({ name: "membership_plans", comment: "订阅计划" })
export class MembershipPlans extends BaseEntity {
    @Column({
        type: "varchar",
        length: 64,
        comment: "计划名称",
    })
    name: string;

    @Column({
        type: "varchar",
        length: 64,
        comment: "计划标签",
        nullable: true,
    })
    label: string;

    /**
     * 订阅时长配置 1-月度会员 2-季度会员 3-半年会员 4-年度会员 5-终身会员 6-自定义
     */
    @Column({
        type: "enum",
        enum: MembershipPlanDuration,
        default: MembershipPlanDuration.MONTH,
        comment: "订阅时长配置",
    })
    durationConfig: MembershipPlanDuration;

    @Column({
        type: "jsonb",
        default: {},
        comment: "订阅时长",
    })
    duration: Duration;

    @Column({
        type: "jsonb",
        default: [],
        comment: "会员计费",
    })
    billing: Billing[];

    @Column({
        type: "boolean",
        default: true,
        comment: "状态",
    })
    status: boolean;

    @Column({
        type: "int",
        default: 0,
        comment: "排序",
    })
    sort: number;
}
