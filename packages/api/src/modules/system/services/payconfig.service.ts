import { BaseService } from "@buildingai/base";
import {
    AlipayConfig,
    PayConfigPayType,
    type PayConfigType,
    PaymentConfig,
    WeChatPayConfig,
} from "@buildingai/constants/shared/payconfig.constant";
import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Payconfig } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { PAY_EVENTS } from "@common/modules/pay/constants/pay-events.contant";
import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { UpdatePayConfigDto, UpdatePayConfigStatusDto } from "../dto/update-payconfig";

@Injectable()
export class PayconfigService extends BaseService<Payconfig> {
    constructor(
        @InjectRepository(Payconfig) repository: Repository<Payconfig>,
        private readonly eventEmitter: EventEmitter2,
    ) {
        super(repository);
    }
    /**
     * 获取支付配置列表
     *
     * @returns 支付配置列表(不分页)
     */
    async list(): Promise<Payconfig[]> {
        const queryBuilder = this.repository.createQueryBuilder("payconfig");
        queryBuilder
            .select([
                "payconfig.id",
                "payconfig.name",
                "payconfig.payType",
                "payconfig.isEnable",
                "payconfig.logo",
                "payconfig.sort",
                "payconfig.isDefault",
            ])
            .orderBy("sort", "DESC");
        return await queryBuilder.getMany();
    }

    async getDetail(id: string): Promise<Payconfig> {
        const queryBuilder = this.repository.createQueryBuilder("payConfig");
        queryBuilder
            .select([
                "payConfig.id",
                "payConfig.name",
                "payConfig.payType",
                "payConfig.isEnable",
                "payConfig.logo",
                "payConfig.sort",
                "payConfig.isDefault",
                "payConfig.config",
            ])
            .where("payConfig.id = :id", { id })
            .orderBy("sort", "DESC");

        const payConfig = await queryBuilder.getOne();
        if (!payConfig) {
            throw HttpErrorFactory.notFound("支付配置不存在");
        }

        return payConfig;
    }

    /**
     * 根据id更改支付配置状态
     *
     * @param id 支付配置id
     * @param dto
     * @returns 更新后的支付配置
     */
    async updateStatus(id: string, dto: UpdatePayConfigStatusDto): Promise<Partial<Payconfig>> {
        const payconfig = await this.repository.findOne({ where: { id } });
        if (!payconfig) {
            throw HttpErrorFactory.notFound("支付配置不存在");
        }

        payconfig.isEnable = dto.isEnable;

        const result = await this.repository.save(payconfig);

        this.eventEmitter.emit(PAY_EVENTS.REFRESH, payconfig.payType);

        const rest = { ...result };
        delete rest.config;

        return rest;
    }

    /**
     * 根据id更新支付配置
     *
     * @param id 支付配置id
     * @param dto 更新后的支付配置
     * @returns 更新后的支付配置
     */
    async updatePayconfig(id: string, dto: UpdatePayConfigDto): Promise<Partial<Payconfig>> {
        return await this.dataSource.transaction(async (manager) => {
            const activeConfig = await manager.findOne(Payconfig, {
                where: { isDefault: BooleanNumber.YES },
            });

            if (activeConfig && id !== activeConfig.id) {
                await manager.update(Payconfig, activeConfig.id, { isDefault: BooleanNumber.NO });
            }

            const payConfig = await manager.findOne(Payconfig, { where: { id } });
            if (!payConfig) {
                throw HttpErrorFactory.notFound("支付配置不存在");
            }

            Object.assign(payConfig, dto);
            const result = await manager.save(payConfig);

            this.eventEmitter.emit(PAY_EVENTS.REFRESH, payConfig.payType);

            return result;
        });
    }

    async getPayconfig(payType: typeof PayConfigPayType.WECHAT): Promise<WeChatPayConfig>;
    async getPayconfig(payType: typeof PayConfigPayType.ALIPAY): Promise<AlipayConfig>;

    /**
     * 根据支付方式获取支付配置
     *
     * @param payType 支付方式
     * @returns 支付配置
     */
    async getPayconfig(payType: PayConfigType): Promise<PaymentConfig> {
        const payconfig = await this.repository.findOne({
            where: { isEnable: BooleanNumber.YES, payType },
        });
        if (!payconfig) {
            throw HttpErrorFactory.notFound("支付配置不存在");
        }

        return payconfig.config as unknown as PaymentConfig;
    }
}
