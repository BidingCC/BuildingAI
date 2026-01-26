import { type PayConfigType } from "@buildingai/constants/shared/payconfig.constant";

import { Column, Index } from "../typeorm";
import { AppEntity } from "./../decorators/app-entity.decorator";
import { BaseEntity } from "./base";

@AppEntity({ name: "refund_log", comment: "退款日志" })
export class RefundLog extends BaseEntity {
    /**
     * 退款编号
     */
    @Column({
        type: "varchar",
        comment: "退款编号",
    })
    @Index()
    refundNo: string;

    /**
     * 用户ID
     */
    @Column({
        type: "uuid",
        comment: "用户ID",
    })
    @Index()
    userId: string;

    @Column({
        type: "uuid",
        comment: "订单id",
    })
    orderId: string;

    @Column({
        type: "varchar",
        length: 64,
        comment: "退款订单编号（冗余字段）",
    })
    orderNo: string;

    @Column({
        type: "int",
        comment: "支付类型",
    })
    payType: PayConfigType;

    @Column({
        type: "decimal",
        precision: 10,
        scale: 2,
        comment: "订单付款金额",
    })
    orderAmount: number;

    @Column({
        type: "decimal",
        precision: 10,
        scale: 2,
        comment: "退款金额金额",
    })
    refundAmount: number;

    @Column({
        type: "varchar",
        length: 128,
        comment: "第三方平台交易流水号",
    })
    transactionId: string;

    @Column({
        type: "int",
        default: 0,
        comment: "退款状态",
    })
    refundStatus: number;

    @Column({
        type: "timestamp with time zone",
        nullable: true,
        comment: "退款时间",
    })
    refundTime?: Date;

    @Column({
        type: "varchar",
        length: 128,
        comment: "第三方退款交易流水号",
        nullable: true,
    })
    tradeNo: string;

    @Column({
        type: "jsonb",
        comment: "退款信息记录",
        nullable: true,
    }) // 存储 JSON 数据，允许为空
    refundMsg: Record<string, any>;
}
