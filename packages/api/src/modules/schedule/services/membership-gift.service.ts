import {
    ACCOUNT_LOG_SOURCE,
    ACCOUNT_LOG_TYPE,
} from "@buildingai/constants/shared/account-log.constants";
import { Cron } from "@buildingai/core/@nestjs/schedule";
import { AppBillingService } from "@buildingai/core/modules";
import { InjectDataSource, InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AccountLog, User, UserSubscription } from "@buildingai/db/entities";
import { DataSource } from "@buildingai/db/typeorm";
import {
    calculateDueMembershipGiftCycle,
    calculateMembershipGiftExpireAt,
} from "@modules/membership/utils/membership-gift-cycle";
import { Injectable, Logger } from "@nestjs/common";
import type { EntityManager } from "typeorm";
import { Repository } from "typeorm";

const EXPIRED_GIFT_BATCH_SIZE = 1000;

/**
 * 会员积分赠送定时任务服务
 *
 * 积分发放和清零逻辑:
 * - 用户购买会员后立即赠送积分,过期时间为下一个自然月会员周期或订阅结束时间
 * - 每天检查当天需要清零的过期积分
 * - 每天检查当天需要发放新积分的订阅(到达订阅开始日期的自然月周年日)
 */
@Injectable()
export class MembershipGiftService {
    private readonly logger = new Logger(MembershipGiftService.name);

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(UserSubscription)
        private readonly userSubscriptionRepository: Repository<UserSubscription>,
        @InjectRepository(AccountLog)
        private readonly accountLogRepository: Repository<AccountLog>,
        private readonly appBillingService: AppBillingService,
    ) {}

    /**
     * 使用 PostgreSQL advisory lock 为任务加分布式锁，避免多实例重复执行。
     *
     * 注意：advisory lock 是连接级别（session-scoped），因此必须通过 QueryRunner
     * 持有同一个连接来获取/释放锁。
     *
     * @param lockKey 锁 key（业务唯一）
     * @param handler 在持锁期间执行的任务
     */
    private async runWithPgAdvisoryLock(
        lockKey: string,
        handler: (manager: EntityManager) => Promise<void>,
    ): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();

        await queryRunner.connect();
        try {
            const result = await queryRunner.query(
                "SELECT pg_try_advisory_lock(hashtext($1)) AS locked",
                [lockKey],
            );
            const locked = Boolean(result?.[0]?.locked);

            if (!locked) {
                this.logger.warn(`任务已在其他实例执行中，跳过本次执行: ${lockKey}`);
                return;
            }

            try {
                await handler(queryRunner.manager);
            } finally {
                await queryRunner.query("SELECT pg_advisory_unlock(hashtext($1))", [lockKey]);
            }
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * 每天凌晨0点执行:清零过期的会员赠送积分
     */
    @Cron("0 0 * * *", {
        name: "daily-expired-gift-power-cleanup",
        timeZone: "Asia/Shanghai",
    })
    async handleExpiredGiftPowerCleanup() {
        await this.runWithPgAdvisoryLock("cron:membership-gift:expired-cleanup", async () => {
            this.logger.log("开始执行过期会员赠送积分清零任务");

            try {
                const now = new Date();
                let totalProcessed = 0;
                const failedLogIds = new Set<string>();

                while (true) {
                    const queryBuilder = this.accountLogRepository
                        .createQueryBuilder("log")
                        .select(["log.id"])
                        .where("log.expireAt <= :now", { now })
                        .andWhere("log.availableAmount > 0")
                        .andWhere("log.accountType = :accountType", {
                            accountType: ACCOUNT_LOG_TYPE.MEMBERSHIP_GIFT_INC,
                        })
                        .orderBy("log.expireAt", "ASC")
                        .addOrderBy("log.createdAt", "ASC")
                        .take(EXPIRED_GIFT_BATCH_SIZE);

                    if (failedLogIds.size > 0) {
                        queryBuilder.andWhere("log.id NOT IN (:...failedLogIds)", {
                            failedLogIds: Array.from(failedLogIds),
                        });
                    }

                    const expiredLogs = await queryBuilder.getMany();

                    if (expiredLogs.length === 0) {
                        break;
                    }

                    totalProcessed += expiredLogs.length;
                    this.logger.log(
                        `本批找到 ${expiredLogs.length} 条过期会员赠送积分记录，累计 ${totalProcessed} 条`,
                    );

                    for (const log of expiredLogs) {
                        try {
                            await this.processExpiredGiftPower(log.id);
                        } catch (error) {
                            failedLogIds.add(log.id);
                            this.logger.error(`处理过期积分记录 ${log.id} 失败: ${error.message}`);
                        }
                    }
                }

                this.logger.log(`过期会员赠送积分清零任务执行完成，共处理 ${totalProcessed} 条`);
            } catch (error) {
                this.logger.error(`过期积分清零任务执行失败: ${error.message}`);
            }
        });
    }

    /**
     * 处理单条过期的会员赠送积分记录
     * @param log 过期的积分记录
     */
    private async processExpiredGiftPower(logId: string) {
        await this.userRepository.manager.transaction(async (entityManager) => {
            const now = new Date();
            const lockedLog = await entityManager.findOne(AccountLog, {
                where: { id: logId },
                lock: { mode: "pessimistic_write" },
            });

            if (!lockedLog) return;
            if (!lockedLog.expireAt || lockedLog.expireAt > now) return;
            if (((lockedLog as any).availableAmount ?? 0) <= 0) return;

            await this.appBillingService.reconcileExpiredTemporaryPower(
                lockedLog.userId,
                entityManager,
                [lockedLog.id],
            );
        });
    }

    /**
     * 每天凌晨0点5分执行:为当天需要发放积分的会员发放新积分
     * 发放条件:到达订阅开始日期的自然月周年日,且订阅仍覆盖下一个周期
     */
    @Cron("5 0 * * *", {
        name: "daily-gift-power-grant",
        timeZone: "Asia/Shanghai",
    })
    async handleDailyGiftPowerGrant() {
        await this.runWithPgAdvisoryLock("cron:membership-gift:daily-grant", async () => {
            this.logger.log("开始执行每日会员积分发放任务");

            try {
                const grantDate = new Date();
                grantDate.setHours(0, 0, 0, 0); // 归一化到当天 0 点
                const grantDayEnd = new Date(grantDate);
                grantDayEnd.setDate(grantDayEnd.getDate() + 1);

                const activeSubscriptions = await this.userSubscriptionRepository
                    .createQueryBuilder("subscription")
                    .leftJoinAndSelect("subscription.level", "level")
                    .where("subscription.startTime < :grantDayEnd", { grantDayEnd })
                    .andWhere("subscription.endTime > :grantDate", { grantDate })
                    .getMany();

                const subscriptionsToGrant: Array<{ subscriptionId: string; cycle: number }> = [];

                for (const subscription of activeSubscriptions) {
                    const cycle = await this.calculateCurrentGrantCycle(subscription, grantDate);

                    if (cycle !== null) {
                        subscriptionsToGrant.push({
                            subscriptionId: subscription.id,
                            cycle,
                        });
                    }
                }

                this.logger.log(`找到 ${subscriptionsToGrant.length} 个今日需要发放积分的会员订阅`);

                for (const { subscriptionId, cycle } of subscriptionsToGrant) {
                    try {
                        await this.processUserGiftPower(subscriptionId, grantDate, cycle);
                    } catch (error) {
                        this.logger.error(
                            `处理订阅 ${subscriptionId} 的积分发放失败: ${error.message}`,
                        );
                    }
                }

                this.logger.log("每日会员积分发放任务执行完成");
            } catch (error) {
                this.logger.error(`每日会员积分任务执行失败: ${error.message}`);
            }
        });
    }

    /**
     * 处理单个用户的积分赠送
     * @param subscription 用户订阅记录
     */
    private async processUserGiftPower(subscriptionId: string, grantDate: Date, cycle: number) {
        const dayStart = new Date(grantDate);
        dayStart.setHours(0, 0, 0, 0);

        await this.userRepository.manager.transaction(async (entityManager) => {
            const lockedSubscription = await entityManager.findOne(UserSubscription, {
                where: { id: subscriptionId },
                lock: { mode: "pessimistic_write" },
            });

            if (!lockedSubscription) return;
            if (lockedSubscription.startTime > dayStart || lockedSubscription.endTime < dayStart)
                return;

            const subscription = await entityManager.findOne(UserSubscription, {
                where: { id: subscriptionId },
                relations: ["level", "order"],
            });

            if (!subscription) return;

            const givePower = (subscription.level as any)?.givePower || 0;
            if (givePower <= 0) return;

            const baseAssociationNo = await this.getMembershipGiftBaseAssociationNo(
                subscription,
                entityManager,
            );
            const associationNo = this.generateMembershipGiftAssociationNo(
                baseAssociationNo,
                cycle,
            );

            const existed = await entityManager
                .createQueryBuilder(AccountLog, "log")
                .where("log.userId = :userId", { userId: subscription.userId })
                .andWhere("log.accountType = :accountType", {
                    accountType: ACCOUNT_LOG_TYPE.MEMBERSHIP_GIFT_INC,
                })
                .andWhere("log.associationNo = :associationNo", { associationNo })
                .getOne();

            if (existed) {
                this.logger.warn(
                    `用户 ${subscription.userId} 周期 ${cycle} 已发放过会员积分，跳过：${associationNo}`,
                );
                return;
            }

            const expireAt = calculateMembershipGiftExpireAt(
                subscription.startTime,
                subscription.endTime,
                cycle,
            );

            await this.appBillingService.addUserPower(
                {
                    amount: givePower,
                    accountType: ACCOUNT_LOG_TYPE.MEMBERSHIP_GIFT_INC,
                    userId: subscription.userId,
                    source: {
                        type: ACCOUNT_LOG_SOURCE.MEMBERSHIP_GIFT,
                        source: "会员周期赠送",
                    },
                    remark: `会员周期赠送临时积分：${givePower}`,
                    associationNo,
                    expireAt,
                    subscriptionId: subscription.id,
                },
                entityManager,
            );

            this.logger.log(
                `用户 ${subscription.userId} 周期 ${cycle} 积分发放完成,赠送 ${givePower} 积分,过期时间 ${expireAt.toISOString()}`,
            );
        });
    }

    private async calculateCurrentGrantCycle(subscription: UserSubscription, currentDate: Date) {
        const lastGrantedCycle = await this.getLastGrantedCycle(subscription.id);

        return calculateDueMembershipGiftCycle({
            subscriptionStartTime: subscription.startTime,
            subscriptionEndTime: subscription.endTime,
            grantDate: currentDate,
            lastGrantedCycle,
        });
    }

    private async getLastGrantedCycle(subscriptionId: string) {
        const lastLog = await this.accountLogRepository.findOne({
            where: {
                subscriptionId,
                accountType: ACCOUNT_LOG_TYPE.MEMBERSHIP_GIFT_INC,
            } as any,
            select: ["associationNo"],
            order: {
                createdAt: "DESC",
            },
        });

        if (!lastLog?.associationNo) {
            return -1;
        }

        return this.parseMembershipGiftCycle(lastLog.associationNo);
    }

    private async getMembershipGiftBaseAssociationNo(
        subscription: UserSubscription,
        entityManager: EntityManager,
    ) {
        const firstGiftLog = await entityManager.findOne(AccountLog, {
            where: {
                subscriptionId: subscription.id,
                accountType: ACCOUNT_LOG_TYPE.MEMBERSHIP_GIFT_INC,
            } as any,
            order: { createdAt: "ASC" },
        });

        if (firstGiftLog?.associationNo) {
            return this.getMembershipGiftBaseNo(firstGiftLog.associationNo);
        }

        if (subscription.order?.orderNo) {
            return subscription.order.orderNo;
        }

        return subscription.id;
    }

    private getMembershipGiftBaseNo(associationNo: string) {
        const matched = associationNo.match(/^(.*)_(\d+)$/);

        return matched?.[1] || associationNo;
    }

    private parseMembershipGiftCycle(associationNo: string) {
        const matched = associationNo.match(/_(\d+)$/);

        return matched ? Number(matched[1]) : 0;
    }

    private generateMembershipGiftAssociationNo(baseNo: string, cycle: number) {
        return `${baseNo}_${cycle}`;
    }
}
