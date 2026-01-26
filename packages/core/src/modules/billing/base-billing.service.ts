import { ACTION } from "@buildingai/constants/shared/account-log.constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { AccountLog } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { generateNo } from "@buildingai/utils";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EntityManager } from "typeorm/entity-manager/EntityManager";

import type { PowerAdditionOptions, PowerDeductionOptions } from "./types";

/**
 * Base Billing Service
 *
 * Provides core billing functionality including:
 * - Power deduction
 * - Power addition
 * - Balance query
 * - Balance validation
 *
 * This is the base service that should be extended by specific billing services
 * (e.g., AppBillingService, ExtensionBillingService)
 */
@Injectable()
export class BaseBillingService {
    protected readonly logger = new Logger(BaseBillingService.name);

    constructor(
        @InjectRepository(User)
        protected readonly userRepository: Repository<User>,
        @InjectRepository(AccountLog)
        protected readonly accountLogRepository: Repository<AccountLog>,
    ) {}

    /**
     * Deduct user power with automatic balance query
     *
     * This method automatically:
     * 1. Queries user's current power balance
     * 2. Validates sufficient balance
     * 3. Deducts power in a transaction
     * 4. Records account log
     *
     * @param options - Power deduction options
     * @param entityManager - Optional entity manager for external transaction
     * @returns void
     * @throws NotFoundException if user not found or insufficient power
     *
     * @example
     * ```ts
     * await baseBillingService.deductUserPower({
     *   userId: 'user-id',
     *   amount: 1,
     *   accountType: ACCOUNT_LOG_TYPE.PLUGIN_DEC,
     *   source: {
     *     type: ACCOUNT_LOG_SOURCE.PLUGIN,
     *     source: 'My Plugin'
     *   },
     *   remark: 'Plugin execution fee'
     * });
     * ```
     */
    async deductUserPower(
        options: PowerDeductionOptions,
        entityManager?: EntityManager,
    ): Promise<void> {
        const {
            userId,
            amount,
            accountType,
            source,
            remark = "",
            associationNo = "",
            associationUserId,
        } = options;

        if (amount <= 0) {
            this.logger.debug(`No power to deduct for user ${userId}`);
            return;
        }

        try {
            const executeDeduction = async (manager: EntityManager) => {
                // Query user's current power balance
                const user = await manager.findOne(User, {
                    where: { id: userId },
                });

                if (!user) {
                    throw new NotFoundException("用户不存在");
                }

                // Validate sufficient balance
                if (user.power < amount) {
                    throw new BadRequestException(
                        `余额不足。当前余额: ${user.power}, 需要: ${amount}`,
                    );
                }

                // 优先扣除会员赠送的临时积分(未过期且有剩余的)
                let remainingToDeduct = amount;
                const now = new Date();

                // 查询用户所有未过期且有剩余可用数量的会员赠送积分记录
                // 按过期时间升序排列,优先使用即将过期的积分
                const giftPowerLogs = await manager
                    .createQueryBuilder(AccountLog, "log")
                    .where("log.userId = :userId", { userId })
                    .andWhere("log.availableAmount > 0")
                    .andWhere("log.expireAt IS NOT NULL")
                    .andWhere("log.expireAt > :now", { now })
                    .orderBy("log.expireAt", "ASC")
                    .getMany();

                // 依次扣除会员赠送积分
                for (const log of giftPowerLogs) {
                    if (remainingToDeduct <= 0) break;

                    const deductFromThis = Math.min(log.availableAmount, remainingToDeduct);
                    await manager.update(AccountLog, { id: log.id }, {
                        availableAmount: log.availableAmount - deductFromThis,
                    } as any);
                    remainingToDeduct -= deductFromThis;

                    this.logger.debug(
                        `从会员赠送积分记录 ${log.id} 扣除 ${deductFromThis}, 剩余 ${log.availableAmount - deductFromThis}`,
                    );
                }

                // Calculate new power
                const newPower = user.power - amount;

                // Update user power
                await manager.increment(User, { id: userId }, "power", -amount);

                // Record power change log
                await manager.insert(AccountLog, {
                    userId,
                    accountNo: await generateNo(this.accountLogRepository, "accountNo"),
                    accountType,
                    action: ACTION.DEC,
                    changeAmount: amount,
                    leftAmount: newPower,
                    associationNo,
                    associationUserId,
                    remark: remark || `扣费 ${amount} 积分`,
                    sourceInfo: source,
                });

                this.logger.debug(
                    `User ${userId} power deducted: ${amount}, remaining: ${newPower}`,
                );
            };

            // Use provided entity manager or create new transaction
            if (entityManager) {
                await executeDeduction(entityManager);
            } else {
                await this.userRepository.manager.transaction(async (manager) => {
                    await executeDeduction(manager);
                });
            }
        } catch (error) {
            this.logger.error(`Failed to deduct user power: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Add power to user account with automatic balance update
     *
     * This method automatically:
     * 1. Queries user's current power balance
     * 2. Adds power in a transaction
     * 3. Records account log
     *
     * @param options - Power addition options
     * @param entityManager - Optional entity manager for external transaction
     * @returns void
     * @throws NotFoundException if user not found
     *
     * @example
     * ```ts
     * await baseBillingService.addUserPower({
     *   userId: 'user-id',
     *   amount: 100,
     *   accountType: ACCOUNT_LOG_TYPE.RECHARGE_INC,
     *   source: {
     *     type: ACCOUNT_LOG_SOURCE.RECHARGE,
     *     source: 'User Recharge'
     *   },
     *   remark: 'Recharge 100 credits'
     * });
     * ```
     */
    async addUserPower(
        options: PowerAdditionOptions,
        entityManager?: EntityManager,
    ): Promise<void> {
        const {
            userId,
            amount,
            accountType,
            source,
            remark = "",
            associationNo = "",
            associationUserId,
            expireAt,
        } = options;

        if (amount <= 0) {
            this.logger.debug(`No power to add for user ${userId}`);
            return;
        }

        try {
            const executeAddition = async (manager: EntityManager) => {
                // Query user's current power balance
                const user = await manager.findOne(User, {
                    where: { id: userId },
                });

                if (!user) {
                    throw new NotFoundException("用户不存在");
                }

                // Calculate new power
                const newPower = user.power + amount;

                // Update user power
                await manager.increment(User, { id: userId }, "power", amount);

                // Record power change log
                // 如果有过期时间,设置 availableAmount 用于追踪剩余可用数量
                await manager.insert(AccountLog, {
                    userId,
                    accountNo: await generateNo(this.accountLogRepository, "accountNo"),
                    accountType,
                    action: ACTION.INC,
                    changeAmount: amount,
                    leftAmount: newPower,
                    associationNo,
                    associationUserId,
                    remark: remark || `增加 ${amount} 积分`,
                    sourceInfo: source,
                    expireAt: expireAt || null,
                    availableAmount: expireAt ? amount : 0,
                } as any);

                this.logger.debug(
                    `User ${userId} power added: ${amount}, new balance: ${newPower}`,
                );
            };

            // Use provided entity manager or create new transaction
            if (entityManager) {
                await executeAddition(entityManager);
            } else {
                await this.userRepository.manager.transaction(async (manager) => {
                    await executeAddition(manager);
                });
            }
        } catch (error) {
            this.logger.error(`Failed to add user power: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get user's current power balance
     *
     * @param userId - User ID
     * @returns Current power balance
     * @throws HttpErrorFactory.badRequest if user not found
     */
    async getUserPower(userId: string): Promise<number> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException("用户不存在");
        }

        return user.power;
    }

    /**
     * Check if user has sufficient power
     *
     * @param userId - User ID
     * @param requiredAmount - Required power amount
     * @returns true if user has sufficient power
     */
    async hasSufficientPower(userId: string, requiredAmount: number): Promise<boolean> {
        const currentPower = await this.getUserPower(userId);
        return currentPower >= requiredAmount;
    }
}
