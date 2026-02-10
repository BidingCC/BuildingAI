import { BaseService } from "@buildingai/base";
import {
    OrderPayFrom,
    OrderStatus,
    PAY_TIMEOUT,
    PayStatus,
    RefundStatus,
} from "@buildingai/constants/shared/payconfig.constant";
import {
    UserTerminal,
    UserTerminalDescMap,
} from "@buildingai/constants/shared/status-codes.constant";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Payconfig } from "@buildingai/db/entities";
import { RechargeOrder } from "@buildingai/db/entities";
import { RefundLog } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { REFUND_ORDER_FROM } from "@common/modules/refund/constants/refund.constants";
import { RefundService } from "@common/modules/refund/services/refund.service";
import { PayService } from "@modules/pay/services/pay.service";
import { QueryRechargeOrderDto } from "@modules/recharge/dto/query-recharge-order.dto";
import { Injectable } from "@nestjs/common";
import { bignumber, subtract } from "mathjs";
import { LessThanOrEqual } from "typeorm";

@Injectable()
export class RechargeOrderService extends BaseService<RechargeOrder> {
    constructor(
        @InjectRepository(RechargeOrder)
        private readonly RechargeOrderRepository: Repository<RechargeOrder>,
        @InjectRepository(Payconfig)
        private readonly payconfigRepository: Repository<Payconfig>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(RefundLog)
        private readonly refundLogRepository: Repository<RefundLog>,
        private readonly refundService: RefundService,
        private readonly payService: PayService,
    ) {
        super(RechargeOrderRepository);
    }
    /**
     * 充值记录列表
     * @param queryRechargeOrderDto
     * @returns
     */
    async lists(queryRechargeOrderDto: QueryRechargeOrderDto) {
        const { orderNo, keyword, payType, payStatus, refundStatus } = queryRechargeOrderDto;
        const queryBuilder = this.RechargeOrderRepository.createQueryBuilder("recharge-order");
        queryBuilder.leftJoin("recharge-order.user", "user");
        if (orderNo) {
            queryBuilder.andWhere("recharge-order.orderNo ILIKE :orderNo", {
                orderNo: `%${orderNo}%`,
            });
        }
        if (keyword) {
            queryBuilder.andWhere("(user.username ILIKE :keyword OR user.phone ILIKE :keyword)", {
                keyword: `%${keyword}%`,
            });
        }
        if (payType) {
            queryBuilder.andWhere("recharge-order.payType = :payType", {
                payType: payType,
            });
        }
        // 使用 != null 以便传入 0（未支付/未退款）时也能正确筛选
        if (payStatus != null) {
            queryBuilder.andWhere("recharge-order.payStatus = :payStatus", {
                payStatus,
            });
        }
        if (refundStatus != null) {
            queryBuilder.andWhere("recharge-order.refundStatus = :refundStatus", {
                refundStatus,
            });
        }
        queryBuilder.select([
            "recharge-order.id",
            "recharge-order.orderNo",
            "recharge-order.payType",
            "recharge-order.payStatus",
            "recharge-order.refundStatus",
            "recharge-order.power",
            "recharge-order.givePower",
            "recharge-order.payTime",
            "recharge-order.createdAt",
            "recharge-order.orderAmount",
            "recharge-order.orderStatus",
            "user.nickname",
            "user.avatar",
        ]);
        const payWayList = await this.payconfigRepository.find({
            select: ["name", "payType"],
        });
        queryBuilder.orderBy("recharge-order.createdAt", "DESC");
        const orderLists = await this.paginateQueryBuilder(queryBuilder, queryRechargeOrderDto);
        orderLists.items = orderLists.items.map((order) => {
            const totalPower = order.power + order.givePower;
            const payTypeDesc = payWayList.find((item) => item.payType == order.payType)?.name;
            const payStatusDesc = order.payStatus == PayStatus.PAID ? "已支付" : "未支付";
            return { ...order, totalPower, payTypeDesc, payStatusDesc };
        });
        const totalOrder = await this.RechargeOrderRepository.count({
            where: { payStatus: PayStatus.PAID },
        });
        const totalAmount =
            (await this.RechargeOrderRepository.sum("orderAmount", {
                payStatus: PayStatus.PAID,
            })) || 0;
        const totalRefundOrder = await this.RechargeOrderRepository.count({
            where: { refundStatus: RefundStatus.SUCCESS },
        });
        const totalRefundAmount =
            (await this.RechargeOrderRepository.sum("orderAmount", {
                refundStatus: RefundStatus.SUCCESS,
            })) || 0;
        // Use BigNumber to avoid floating-point precision
        const totalIncome = Number(
            subtract(bignumber(totalAmount), bignumber(totalRefundAmount)).toString(),
        );
        console.log(totalAmount, totalRefundAmount, totalIncome);
        const statistics = {
            totalOrder,
            totalAmount,
            totalRefundOrder,
            totalRefundAmount,
            totalIncome,
        };
        return {
            ...orderLists,
            extend: {
                statistics,
                payTypeLists: payWayList,
            },
        };
    }

    /**
     * 充值订单详情
     * @param id
     * @returns
     */
    async detail(id: string) {
        const queryBuilder = this.RechargeOrderRepository.createQueryBuilder("recharge-order");
        queryBuilder.leftJoin("recharge-order.user", "user");
        queryBuilder.andWhere("recharge-order.id = :id", { id });
        queryBuilder.select([
            "recharge-order.id",
            "recharge-order.userId",
            "recharge-order.orderNo",
            "recharge-order.payType",
            "recharge-order.payStatus",
            "recharge-order.refundStatus",
            "recharge-order.orderStatus",
            "recharge-order.power",
            "recharge-order.givePower",
            "recharge-order.orderAmount",
            "recharge-order.payTime",
            "recharge-order.createdAt",
            "recharge-order.terminal",
            "user.username",
            "user.avatar",
        ]);
        const detail = await queryBuilder.getOne();
        if (!detail) {
            throw HttpErrorFactory.badRequest("充值订单不存在");
        }
        let refundStatusDesc = "-";
        if (detail.refundStatus === RefundStatus.ING) {
            refundStatusDesc = "退款中";
        } else if (detail.refundStatus === RefundStatus.SUCCESS) {
            refundStatusDesc = "已退款";
        }
        const orderType = "充值订单";
        const totalPower = detail.power + detail.givePower;
        const payTypeDesc = await this.payconfigRepository.findOne({
            select: ["name"],
            where: {
                payType: detail.payType,
            },
        });
        let refundNo = "";
        if (
            detail.refundStatus === RefundStatus.ING ||
            detail.refundStatus === RefundStatus.SUCCESS
        ) {
            refundNo = (
                await this.refundLogRepository.findOne({
                    where: { orderId: detail.id },
                })
            )?.refundNo;
        }

        const terminalDesc =
            UserTerminalDescMap[detail.terminal] ?? UserTerminalDescMap[UserTerminal.PC];
        return {
            ...detail,
            orderType,
            totalPower,
            refundStatusDesc,
            terminalDesc,
            refundNo,
            payTypeDesc: payTypeDesc.name,
        };
    }

    /**
     * 查询支付结果并同步：向支付渠道查询订单支付状态，若已支付则更新订单与用户积分，返回最新详情
     */
    async syncPayResult(id: string) {
        const order = await this.RechargeOrderRepository.findOne({
            where: { id },
            select: ["id", "userId", "payStatus"],
        });
        if (!order) throw HttpErrorFactory.badRequest("充值订单不存在");
        if (order.payStatus === PayStatus.PAID) return this.detail(id);
        await this.payService.getPayResult(id, OrderPayFrom.RECHARGE, order.userId);
        return this.detail(id);
    }

    /**
     * 查询退款结果并同步：退款中时向支付渠道查询退款状态，若已成功则更新订单与扣积分，返回最新详情
     */
    async syncRefundResult(id: string) {
        const order = await this.RechargeOrderRepository.findOne({
            where: { id },
            select: ["id", "userId", "refundStatus"],
        });
        if (!order) throw HttpErrorFactory.badRequest("充值订单不存在");
        if (order.refundStatus !== RefundStatus.ING) return this.detail(id);
        await this.payService.getRefundResult(id, OrderPayFrom.RECHARGE, order.userId);
        return this.detail(id);
    }

    /**
     * 退款
     * @param id
     */
    async refund(id: string) {
        try {
            const order = await this.RechargeOrderRepository.findOne({
                where: { id },
            });
            if (!order) {
                throw new Error("充值订单不存在");
            }
            if (order.payStatus == PayStatus.PENDING) {
                throw new Error("订单未支付,不能发起退款");
            }
            if (order.refundStatus === RefundStatus.SUCCESS) {
                throw new Error("订单已退款");
            }
            if (order.refundStatus === RefundStatus.ING) {
                throw new Error("订单退款处理中，请勿重复操作");
            }
            if (order.refundStatus === RefundStatus.FAILED) {
                throw new Error("订单退款异常，请登录支付渠道后台手动处理退款");
            }
            await this.refundService.initiateRefund({
                entityManager: this.userRepository.manager,
                orderId: order.id,
                userId: order.userId,
                orderNo: order.orderNo,
                from: REFUND_ORDER_FROM.FROM_RECHARGE,
                payType: order.payType,
                transactionId: order.transactionId,
                orderAmount: order.orderAmount,
                refundAmount: order.orderAmount,
            });
        } catch (error) {
            throw HttpErrorFactory.badRequest(error.message);
        }
    }

    /**
     * 关闭订单（仅未支付订单）：关闭支付渠道订单并更新本地订单状态为已关闭
     * @param id 充值订单 ID
     */
    async closeOrder(id: string) {
        const order = await this.RechargeOrderRepository.findOne({ where: { id } });
        if (!order) throw HttpErrorFactory.badRequest("充值订单不存在");
        if (order.payStatus !== PayStatus.PENDING) {
            throw HttpErrorFactory.badRequest("仅未支付订单可关闭");
        }

        try {
            await this.payService.closePayOrder(order.orderNo, order.payType);
        } catch (err) {
            throw HttpErrorFactory.badRequest(`关闭支付订单失败: ${(err as Error).message}`);
        }
        await this.RechargeOrderRepository.update(id, {
            orderStatus: OrderStatus.CLOSED,
        });
    }

    /**
     * 定时任务：先查询支付结果并更新表，再关闭仍超时未支付的充值订单（创建时间超过 PAY_TIMEOUT 的待支付订单）
     * 支付流程：用户支付，支付回调执行同时前端轮训查询结果，如果支付回调异常，轮训结果也异常，则定时任务10分钟兜底查询，如果兜底查询没有支付成功，则关闭订单支付渠道，修改订单表为订单关闭
     */
    async closeExpiredRechargeOrders(): Promise<void> {
        const deadline = new Date(Date.now() - PAY_TIMEOUT);
        const orders = await this.RechargeOrderRepository.find({
            where: {
                payStatus: PayStatus.PENDING,
                orderStatus: OrderStatus.CREATED,
                createdAt: LessThanOrEqual(deadline),
            },
            select: ["id", "orderNo", "payType", "userId"],
        });
        if (orders.length === 0) return;
        this.logger.log(`处理超时充值订单，共 ${orders.length} 笔`);
        for (const order of orders) {
            try {
                // 先查询支付结果，若已支付则更新表
                const result = await this.payService.getPayResult(
                    order.id,
                    OrderPayFrom.RECHARGE,
                    order.userId,
                );
                if (result && (result as RechargeOrder).payStatus === PayStatus.PAID) {
                    continue; // 已支付，无需关闭
                }
                // 仍未支付，关闭支付渠道并更新订单状态
                await this.payService.closePayOrder(order.orderNo, order.payType);
                await this.RechargeOrderRepository.update(order.id, {
                    orderStatus: OrderStatus.CLOSED,
                });
            } catch (err) {
                this.logger.warn(
                    `关闭支付渠道订单失败 ${order.orderNo}: ${(err as Error).message}`,
                );
            }
        }
    }
}
