import {
    ACCOUNT_LOG_SOURCE,
    ACCOUNT_LOG_TYPE,
} from "@buildingai/constants/shared/account-log.constants";
import { Cron } from "@buildingai/core/@nestjs/schedule";
import { AppBillingService } from "@buildingai/core/modules";
import { InjectDataSource, InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AccountLog, User } from "@buildingai/db/entities";
import { DataSource } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";
import type { EntityManager } from "typeorm";
import { Repository } from "typeorm";

const EXPIRED_AWARD_OVERDUE_BATCH_SIZE = 1000;

/**
 * 积分记录过期清除定时任务
 * 每天凌晨0点执行一次
 */
@Injectable()
export class AwardOverdueClearService {
    private readonly logger = new Logger(AwardOverdueClearService.name);
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
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
     * 每天凌晨0点执行:清零过期的积分
     */
    @Cron("0 0 * * *", {
        name: "award-overdue-clear",
        timeZone: "Asia/Shanghai",
    })
    async handleExpiredAwardClear() {
        await this.runWithPgAdvisoryLock("cron:award:expired-cleanup", async () => {
            this.logger.log("开始执行过期奖励积分清零任务");

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
                            accountType: ACCOUNT_LOG_TYPE.LOGIN_AWARD_INC,
                        })
                        .orderBy("log.expireAt", "ASC")
                        .addOrderBy("log.createdAt", "ASC")
                        .take(EXPIRED_AWARD_OVERDUE_BATCH_SIZE);

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
                        `本批找到 ${expiredLogs.length} 条过期奖励积分记录，累计 ${totalProcessed} 条`,
                    );

                    for (const log of expiredLogs) {
                        try {
                            await this.processExpiredAwardPower(log.id);
                        } catch (error) {
                            failedLogIds.add(log.id);
                            this.logger.error(`处理过期积分记录 ${log.id} 失败: ${error.message}`);
                        }
                    }
                }

                this.logger.log(`过期奖励积分清零任务执行完成，共处理 ${totalProcessed} 条`);
            } catch (error) {
                this.logger.error(`过期奖励积分清零任务执行失败: ${error.message}`);
            }
        });
    }

    /**
     * 处理单条过期的奖励积分记录
     * @param log 过期的积分记录
     */
    private async processExpiredAwardPower(logId: string) {
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
}
