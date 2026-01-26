import { Column, Index, JoinColumn, ManyToOne } from "typeorm";

import { AppEntity } from "../decorators/app-entity.decorator";
import { BaseEntity } from "./base";
import { MembershipLevels } from "./membership-levels.entity";
import { MembershipOrder } from "./membership-order.entity";
import { User } from "./user.entity";

@AppEntity({
    name: "user_subscription",
    comment: "用户订阅",
})
export class UserSubscription extends BaseEntity {
    /**
     * 用户ID
     */
    @Column({
        comment: "用户ID",
    })
    @Index()
    userId: string;

    @Column({
        type: "uuid",
        comment: "会员等级ID",
        nullable: true,
    })
    levelId: string | null;

    @Column({ nullable: true })
    orderId: string | null; // 可以为空

    @Column({ type: "timestamptz", comment: "开始时间" })
    startTime: Date;

    @Column({ type: "timestamptz", comment: "到期时间" })
    endTime: Date;

    @ManyToOne(() => MembershipOrder, (order) => order.subscriptions, { nullable: true })
    order: MembershipOrder;

    /**
     * 关联的用户
     */
    @ManyToOne(() => User, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "user_id" })
    user: User;

    /**
     * 来源 0-系统 1-订单
     */
    @Column({
        type: "int",
        comment: "来源",
    })
    source: number;

    /**
     * 关联的会员等级
     */
    @ManyToOne(() => MembershipLevels, { nullable: true })
    @JoinColumn({ name: "level_id" })
    level: MembershipLevels | null;
}
