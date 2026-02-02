import { type PayConfigType } from "@buildingai/constants/shared/payconfig.constant";
import {
    UserTerminal,
    type UserTerminalType,
} from "@buildingai/constants/shared/status-codes.constant";

import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, OneToMany } from "../typeorm";
import { BaseEntity } from "./base";
import { User } from "./user.entity";
import { UserSubscription } from "./user-subscription.entity";

/**
 * 会员订单
 */
@AppEntity({ name: "membership_order", comment: "会员订单" })
export class MembershipOrder extends BaseEntity {
    /**
     * 订单号
     */
    @Column({
        type: "varchar",
        comment: "订单号",
    })
    @Index()
    orderNo: string;

    /**
     * 第三方平台交易流水号
     */
    @Column({
        type: "varchar",
        length: 128,
        comment: "第三方平台交易流水号",
        nullable: true,
    })
    transactionId: string;

    /**
     * 用户ID
     */
    @Column({
        comment: "用户ID",
    })
    @Index()
    userId: string;

    /**
     * 订单来源终端
     *
     * 1: PC, 2: H5, 3: 小程序, 4: APP
     */
    @Column({ type: "int", default: UserTerminal.PC })
    terminal: UserTerminalType;

    /**
     * 会员套餐ID
     */
    @Column({
        comment: "会员套餐ID",
    })
    @Index()
    planId: string;

    /**
     * 会员等级ID
     */
    @Column({
        comment: "会员等级ID",
    })
    @Index()
    levelId: string;

    /**
     * 会员套餐快照
     */
    @Column({
        type: "jsonb",
        comment: "会员套餐快照",
    })
    planSnap: Record<string, any>;

    /**
     * 会员等级快照
     */
    @Column({
        type: "jsonb",
        comment: "会员等级快照",
    })
    levelSnap: Record<string, any>;

    /**
     * 支付类型
     */
    @Column({
        type: "int",
        comment: "支付类型",
    })
    payType: PayConfigType;

    /**
     * 会员时长(已格式化的展示文本)
     * 例如: "1个月"、"3个月"、"12个月"、"终身"、"30天" 等
     */
    @Column({
        type: "varchar",
        length: 64,
        comment: "会员时长(已格式化)",
    })
    duration: string;

    /**
     * 订单总价
     */
    @Column({
        type: "decimal",
        precision: 10,
        scale: 2,
        comment: "订单总价",
    })
    totalAmount: number;

    /**
     * 实付金额
     */
    @Column({
        type: "decimal",
        precision: 10,
        scale: 2,
        comment: "实付金额",
    })
    orderAmount: number;

    /**
     * 订单主状态:0-待支付;1-订单完成;2-取消订单
     */
    @Column({
        type: "int",
        default: 0,
        comment: "订单主状态:0-待支付;1-订单完成;2-取消订单",
    })
    status: number;

    /**
     * 支付状态
     */
    @Column({
        type: "int",
        comment: "支付状态：0-待支付;1-已支付",
        default: 0,
    })
    payState: number;

    /**
     * 支付时间
     */
    @Column({
        type: "timestamp with time zone",
        comment: "支付时间",
        nullable: true,
    })
    payTime?: Date;

    /**
     * 退款状态:0-未退款;1-已退款
     */
    @Column({
        type: "int",
        default: 0,
        comment: "退款状态:0-未退款;1-已退款",
    })
    refundStatus: number;

    /**
     * 退款时间
     */
    @Column({
        type: "timestamp with time zone",
        nullable: true,
        comment: "退款时间",
    })
    refundTime?: Date;

    /**
     * 订单来源: 0-系统调整, 1-订单购买
     */
    @Column({
        type: "int",
        default: 1,
        comment: "订单来源: 0-系统调整, 1-订单购买",
    })
    source: number;

    /**
     * 关联的用户
     */
    @ManyToOne(() => User, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "user_id" })
    user: User;

    // 一个订单可以创建多个订阅
    @OneToMany(() => UserSubscription, (sub) => sub.order, { cascade: false })
    subscriptions: UserSubscription[];
}
