import {
    ACCOUNT_LOG_SOURCE,
    ACCOUNT_LOG_TYPE,
} from "@buildingai/constants/shared/account-log.constants";
import { Cron } from "@buildingai/core/@nestjs/schedule";
import { AppBillingService } from "@buildingai/core/modules";
import { InjectDataSource, InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AccountLog, User, UserSubscription } from "@buildingai/db/entities";
import { DataSource } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";
import type { EntityManager } from "typeorm";
import { LessThanOrEqual, MoreThan, MoreThanOrEqual, Repository } from "typeorm";

/**
 * 会员积分赠送定时任务服务
 *
 * 积分发放和清零逻辑:
 * - 用户购买会员后立即赠送积分,过期时间为 30 天后
 * - 每天检查当天需要清零的过期积分
 * - 每天检查当天需要发放新积分的订阅(距离订阅开始日期是 30 的倍数天)
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

                // 查询所有已过期且还有剩余可用数量的会员赠送积分记录
                const expiredLogs = await this.accountLogRepository.find({
                    where: {
                        expireAt: LessThanOrEqual(now),
                        availableAmount: MoreThan(0),
                    } as any,
                });

                this.logger.log(`找到 ${expiredLogs.length} 条过期的会员赠送积分记录`);

                for (const log of expiredLogs) {
                    try {
                        await this.processExpiredGiftPower(log.id);
                    } catch (error) {
                        this.logger.error(`处理过期积分记录 ${log.id} 失败: ${error.message}`);
                    }
                }

                this.logger.log("过期会员赠送积分清零任务执行完成");
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

            const expiredAmount = (lockedLog as any).availableAmount;
            if (expiredAmount <= 0) return;

            // 1. 将过期积分记录的可用数量清零
            await entityManager.update(AccountLog, { id: lockedLog.id }, {
                availableAmount: 0,
            } as any);

            // 2. 从用户总积分中扣除过期的积分，并记录账户变动日志
            await this.appBillingService.deductUserPower(
                {
                    userId: lockedLog.userId,
                    amount: expiredAmount,
                    accountType: ACCOUNT_LOG_TYPE.MEMBERSHIP_GIFT_EXPIRED,
                    source: {
                        type: ACCOUNT_LOG_SOURCE.MEMBERSHIP_GIFT,
                        source: "订阅积分到期",
                    },
                    remark: `会员赠送积分到期清零：${expiredAmount}`,
                    associationNo: lockedLog.accountNo || "",
                },
                entityManager,
            );

            this.logger.log(`用户 ${lockedLog.userId} 过期积分 ${expiredAmount} 已清零`);
        });
    }

    /**
     * 每天凌晨0点5分执行:为当天需要发放积分的会员发放新积分
     * 发放条件:距离订阅开始日期是 30 的倍数天,且订阅仍在有效期内
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

                // 查询所有有效的会员订阅
                const activeSubscriptions = await this.userSubscriptionRepository.find({
                    where: {
                        startTime: LessThanOrEqual(grantDate),
                        endTime: MoreThanOrEqual(grantDate),
                    },
                    relations: ["level"],
                });

                // 筛选出今天需要发放积分的订阅(距离订阅开始日期是 30 的倍数天)
                const subscriptionsToGrant = activeSubscriptions.filter((sub) => {
                    const startTime = new Date(sub.startTime);
                    startTime.setHours(0, 0, 0, 0); // 归一化到 0 点
                    const diffDays = Math.floor(
                        (grantDate.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24),
                    );
                    // 距离订阅开始日期是 30 的倍数天(不包括第 0 天,因为购买时已发放)
                    return diffDays > 0 && diffDays % 30 === 0;
                });

                this.logger.log(`找到 ${subscriptionsToGrant.length} 个今日需要发放积分的会员订阅`);

                for (const subscription of subscriptionsToGrant) {
                    try {
                        await this.processUserGiftPower(subscription.id, grantDate);
                    } catch (error) {
                        this.logger.error(
                            `处理用户 ${subscription.userId} 的积分发放失败: ${error.message}`,
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
    private async processUserGiftPower(subscriptionId: string, grantDate: Date) {
        const dayStart = new Date(grantDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        await this.userRepository.manager.transaction(async (entityManager) => {
            const subscription = await entityManager.findOne(UserSubscription, {
                where: { id: subscriptionId },
                relations: ["level", "order"],
                lock: { mode: "pessimistic_write" },
            });

            if (!subscription) return;
            if (subscription.startTime > dayStart || subscription.endTime < dayStart) return;

            const givePower = (subscription.level as any)?.givePower || 0;
            if (givePower <= 0) return;

            const associationNo = subscription.order?.orderNo;
            if (!associationNo) {
                this.logger.warn(
                    `用户 ${subscription.userId} 的订阅缺少 orderNo，无法保证幂等，跳过本次会员周期积分发放：${subscription.id}`,
                );
                return;
            }

            // 幂等：同一订阅同一天只允许发放一次
            const existed = await entityManager
                .createQueryBuilder(AccountLog, "log")
                .where("log.userId = :userId", { userId: subscription.userId })
                .andWhere("log.accountType = :accountType", {
                    accountType: ACCOUNT_LOG_TYPE.MEMBERSHIP_GIFT_INC,
                })
                .andWhere("log.associationNo = :associationNo", { associationNo })
                .andWhere("log.createdAt >= :dayStart AND log.createdAt < :dayEnd", {
                    dayStart,
                    dayEnd,
                })
                .getOne();

            if (existed) {
                this.logger.warn(
                    `用户 ${subscription.userId} 今日已发放过会员周期积分，跳过：${associationNo}`,
                );
                return;
            }

            const expireAt = this.getNext30Days(dayStart);

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
                },
                entityManager,
            );

            this.logger.log(
                `用户 ${subscription.userId} 积分发放完成,赠送 ${givePower} 积分,过期时间 ${expireAt.toISOString()}`,
            );
        });
    }

    /**
     * 获取 30 天后的时间
     * @param date 日期
     * @returns 30 天后的 0 点时间
     */
    private getNext30Days(date: Date): Date {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 30);
        nextDate.setHours(0, 0, 0, 0);
        return nextDate;
    }
}
