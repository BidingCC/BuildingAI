import {
    type OrderStatusType,
    type PayConfigType,
    type PayStatusType,
    type RefundStatusType,
} from "@buildingai/constants/shared/payconfig.constant";
import {
    UserTerminal,
    type UserTerminalType,
} from "@buildingai/constants/shared/status-codes.constant";

import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne } from "../typeorm";
import { BaseEntity } from "./base";
import { User } from "./user.entity";

/**
 * 充值订单
 */
@AppEntity({ name: "recharge_order", comment: "充值订单" })
export class RechargeOrder extends BaseEntity {
    /**
     * 订单号
     */
    @Column({
        type: "varchar",
        comment: "订单号",
    })
    @Index()
    orderNo: string;

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
        // type: "uuid",
        comment: "用户ID",
    })
    @Index()
    userId: string;

    /**
     * 订单来源终端
     *
     * 1: PC, 2: H5, 3: 小程序, 4: APP 5: OA
     */
    @Column({ type: "int", default: UserTerminal.PC })
    terminal: UserTerminalType;
    /**
     * 充值id
     */
    @Column({
        // type: "uuid",
        comment: "充值id",
    })
    @Index()
    rechargeId: string;

    @Column({
        type: "jsonb",
        comment: "充值快照",
    }) // 存储 JSON 数据，允许为空
    rechargeSnap: Record<string, any>;

    @Column({
        type: "int",
        comment: "支付类型",
    })
    payType: PayConfigType;

    @Column({
        type: "integer",
        comment: "充值的数量",
    })
    power: number;

    @Column({
        type: "integer",
        comment: "赠送的数量",
    })
    givePower: number;

    @Column({
        type: "decimal",
        precision: 10,
        scale: 2,
        comment: "订单总价",
    })
    totalAmount: number;

    @Column({
        type: "decimal",
        precision: 10,
        scale: 2,
        comment: "实付金额",
    })
    orderAmount: number;

    @Column({
        type: "int",
        default: 0,
        comment: "支付状态",
    })
    payStatus: PayStatusType;

    @Column({
        type: "int",
        default: 0,
        comment: "订单状态",
    })
    orderStatus: OrderStatusType;

    @Column({
        type: "timestamp with time zone",
        comment: "支付时间",
        nullable: true,
    })
    payTime?: Date;

    @Column({
        type: "int",
        default: 0,
        comment: "退款状态",
    })
    refundStatus: RefundStatusType;

    @Column({
        type: "timestamp with time zone",
        nullable: true,
        comment: "退款时间",
    })
    refundTime?: Date;

    /**
     * 关联的用户
     */
    @ManyToOne(() => User, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "user_id" })
    user: User;
}
