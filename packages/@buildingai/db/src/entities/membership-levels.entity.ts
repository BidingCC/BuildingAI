import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, ManyToMany } from "../typeorm";
import { AiModel } from "./ai-model.entity";
import { BaseEntity } from "./base";

/**
 * 会员权益项
 */
export interface Benefits {
    /** 权益图标 */
    icon: string;
    /** 权益内容 */
    content: string;
}

@AppEntity({ name: "membership_levels", comment: "会员等级" })
export class MembershipLevels extends BaseEntity {
    @Column({
        type: "varchar",
        length: 64,
        comment: "会员等级名称",
    })
    name: string;

    @Column({
        type: "int",
        default: 0,
        comment: "每月赠送的积分",
    })
    givePower: number;

    @Column({
        type: "int",
        comment: "会员等级级别",
    })
    level: number;

    @Column({
        type: "boolean",
        default: true,
        comment: "状态",
    })
    status: boolean;

    @Column({
        type: "varchar",
        length: 255,
        default: 0,
        comment: "会员等级图标",
    })
    icon: string;

    @Column({
        type: "varchar",
        length: 255,
        comment: "会员等级描述",
        nullable: true,
    })
    description: string;

    @Column({
        type: "jsonb",
        default: [],
        comment: "会员等权益",
    })
    benefits: Benefits[];

    @ManyToMany(() => AiModel, (model) => model.membershipLevels)
    aiModels: AiModel[];
}
