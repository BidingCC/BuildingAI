import { BaseService } from "@buildingai/base";
import { PayConfigType } from "@buildingai/constants/shared/payconfig.constant";
import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import { type UserTerminalType } from "@buildingai/constants/shared/status-codes.constant";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Payconfig } from "@buildingai/db/entities";
import { Dict } from "@buildingai/db/entities";
import { RechargeOrder } from "@buildingai/db/entities";
import { Recharge } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { DictService } from "@buildingai/dict";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { generateNo } from "@buildingai/utils";
import { UpdatePayConfigDto } from "@modules/system/dto/update-payconfig";
import { Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

@Injectable()
export class RechargeService extends BaseService<Dict> {
    private readonly rechargeOrderService: BaseService<RechargeOrder>;

    constructor(
        private readonly dictService: DictService,
        @InjectRepository(Dict) repository: Repository<Dict>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Recharge)
        private readonly rechargeRepository: Repository<Recharge>,
        @InjectRepository(RechargeOrder)
        private readonly rechargeOrderRepository: Repository<RechargeOrder>,
        @InjectRepository(Payconfig)
        private readonly payconfigRepository: Repository<Payconfig>,
    ) {
        super(repository);
        this.rechargeOrderService = new BaseService(rechargeOrderRepository);
    }

    /**
     * 充值记录
     * @param paginationDto
     * @param userId
     * @returns
     */
    async lists(paginationDto: PaginationDto, userId: string) {
        const orderLists = await this.rechargeOrderService.paginate(paginationDto, {
            where: [
                {
                    userId: userId,
                    payStatus: 1,
                },
            ],
            excludeFields: [
                "rechargeSnap",
                "payStatus",
                "payTime",
                "rechargeId",
                "userId",
                "refundTime",
            ],
            order: { createdAt: "DESC" },
        });
        const payWayList = await this.payconfigRepository.find({
            select: ["name", "payType"],
        });
        orderLists.items = orderLists.items.map((order) => {
            const totalPower = order.power + order.givePower;
            let payTypeDesc = payWayList.find((item) => item.payType == order.payType)?.name;
            if (1 === order.refundStatus) {
                payTypeDesc = "已退款";
            }

            return { ...order, totalPower, payTypeDesc };
        });
        return orderLists;
    }
    /**
     * 充值中心
     * @param userId
     * @returns
     */
    async center(userId: string) {
        const user = await this.userRepository.findOne({
            where: {
                id: userId,
            },
            select: ["id", "userNo", "username", "avatar", "power"],
        });
        //充值状态
        const rechargeStatus = await this.dictService.get(
            "recharge_status",
            false,
            "recharge_config",
        );
        //充值说明
        const rechargeExplain = await this.dictService.get(
            "recharge_explain",
            "",
            "recharge_config",
        );
        const rechargeRule = await this.rechargeRepository.find({
            select: ["id", "power", "givePower", "sellPrice", "label"],
        });
        const payWayList = await this.payconfigRepository.find({
            where: { isEnable: BooleanNumber.YES },
            select: ["name", "payType", "logo"],
        });

        return {
            user,
            rechargeStatus,
            rechargeExplain,
            rechargeRule,
            payWayList,
        };
    }

    /**
     * 充值订单提交
     * @param id
     * @param payType
     * @param userId
     * @param terminal
     * @returns
     */
    async submitRecharge(
        id: string,
        payType: PayConfigType,
        userId: string,
        terminal: UserTerminalType,
    ) {
        //充值状态
        const rechargeStatus = await this.dictService.get(
            "recharge_status",
            false,
            "recharge_config",
        );
        if (false == rechargeStatus) {
            throw HttpErrorFactory.badRequest("充值已关闭");
        }
        // if (PayConfigPayType.WECHAT != payType) {
        //     throw HttpErrorFactory.badRequest("支付方式错误");
        // }
        const recharge = await this.rechargeRepository.findOne({
            where: {
                id,
            },
        });
        if (!recharge) {
            throw HttpErrorFactory.badRequest("充值套餐不存在");
        }
        const orderNo = await generateNo(this.rechargeOrderRepository, "orderNo");
        //下单
        const rechargeOrder = await this.rechargeOrderRepository.save({
            userId,
            terminal,
            orderNo,
            rechargeId: id,
            power: recharge.power,
            givePower: recharge.givePower,
            totalAmount: recharge.sellPrice,
            orderAmount: recharge.sellPrice,
            rechargeSnap: { ...recharge },
            payType: payType,
        });

        return {
            orderId: rechargeOrder.id,
            orderNo,
            orderAmount: rechargeOrder.orderAmount,
        };
    }
}
