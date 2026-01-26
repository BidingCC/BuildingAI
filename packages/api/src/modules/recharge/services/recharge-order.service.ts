import { BaseService } from "@buildingai/base";
import {
    ACCOUNT_LOG_SOURCE,
    ACCOUNT_LOG_TYPE,
} from "@buildingai/constants/shared/account-log.constants";
import { AppBillingService } from "@buildingai/core/modules";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Payconfig } from "@buildingai/db/entities";
import { RechargeOrder } from "@buildingai/db/entities";
import { RefundLog } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { REFUND_ORDER_FROM } from "@common/modules/refund/constants/refund.constants";
import { RefundService } from "@common/modules/refund/services/refund.service";
import { QueryRechargeOrderDto } from "@modules/recharge/dto/query-recharge-order.dto";
import { Injectable } from "@nestjs/common";

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
        private readonly appBillingService: AppBillingService,
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
        if (payStatus) {
            queryBuilder.andWhere("recharge-order.payStatus = :payStatus", {
                payStatus: payStatus,
            });
        }
        if (refundStatus) {
            queryBuilder.andWhere("recharge-order.refundStatus = :refundStatus", {
                refundStatus: refundStatus,
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
            const payStatusDesc = order.payStatus == 1 ? "已支付" : "未支付";
            return { ...order, totalPower, payTypeDesc, payStatusDesc };
        });
        const totalOrder = await this.RechargeOrderRepository.count({
            where: { payStatus: 1 },
        });
        const totalAmount =
            (await this.RechargeOrderRepository.sum("orderAmount", {
                payStatus: 1,
            })) || 0;
        const totalRefundOrder = await this.RechargeOrderRepository.count({
            where: { refundStatus: 1 },
        });
        const totalRefundAmount =
            (await this.RechargeOrderRepository.sum("orderAmount", {
                refundStatus: 1,
            })) || 0;
        const totalIncome = totalAmount - totalRefundAmount;
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
            "recharge-order.orderNo",
            "recharge-order.payType",
            "recharge-order.payStatus",
            "recharge-order.refundStatus",
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
        if (detail.refundStatus) {
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
        if (detail.refundStatus) {
            refundNo = (
                await this.refundLogRepository.findOne({
                    where: { orderId: detail.id },
                })
            )?.refundNo;
        }
        const terminalDesc = "电脑PC";
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
            if (0 == order.payStatus) {
                throw new Error("订单未支付,不能发起退款");
            }
            if (order.refundStatus) {
                throw new Error("订单已退款");
            }
            const totalPower = order.power + order.givePower;
            await this.userRepository.manager.transaction(async (entityManager) => {
                // Initiate refund
                await this.refundService.initiateRefund({
                    entityManager,
                    orderId: order.id,
                    userId: order.userId,
                    orderNo: order.orderNo,
                    from: REFUND_ORDER_FROM.FROM_RECHARGE,
                    payType: order.payType,
                    transactionId: order.transactionId,
                    orderAmount: order.orderAmount,
                    refundAmount: order.orderAmount,
                });
                // Update refund status
                await entityManager.update(RechargeOrder, id, {
                    refundStatus: 1,
                });
                // Deduct user power using AppBillingService
                await this.appBillingService.deductUserPower(
                    {
                        userId: order.userId,
                        amount: totalPower,
                        accountType: ACCOUNT_LOG_TYPE.RECHARGE_DEC,
                        source: {
                            type: ACCOUNT_LOG_SOURCE.RECHARGE,
                            source: "充值订单",
                        },
                        remark: `充值订单退款，退款金额：${order.orderAmount}`,
                        associationNo: order.orderNo,
                    },
                    entityManager,
                );
            });
        } catch (error) {
            throw HttpErrorFactory.badRequest(error.message);
        }
    }
}
