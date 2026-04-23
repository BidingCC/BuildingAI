import { BaseService } from "@buildingai/base";
import { RedisService } from "@buildingai/cache";
import {
    ACCOUNT_LOG_SOURCE,
    ACCOUNT_LOG_TYPE,
} from "@buildingai/constants/shared/account-log.constants";
import { AppBillingService } from "@buildingai/core/modules";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AccountLog, MembershipLevels, User, UserSubscription } from "@buildingai/db/entities";
import { Between, In, MoreThan, Repository } from "@buildingai/db/typeorm";
import { DictService } from "@buildingai/dict";
import { LOGIN_CONFIG_CACHE_PREFIX } from "@modules/award/constants/award-config.constants";
import { Injectable } from "@nestjs/common";

@Injectable()
export class UserAwardService extends BaseService<User> {
    private readonly LOGIN_CACHE_PREFIX = "login-award:";

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(AccountLog)
        private readonly accountLogRepository: Repository<AccountLog>,
        @InjectRepository(UserSubscription)
        private readonly userSubscriptionRepository: Repository<UserSubscription>,
        @InjectRepository(MembershipLevels)
        private readonly membershipLevelsRepository: Repository<MembershipLevels>,
        private readonly dictService: DictService,
        private readonly appBillingService: AppBillingService,
        private readonly cacheService: RedisService,
    ) {
        super(userRepository);
    }

    /**
     * 注册奖励
     * @param userId
     * @returns
     */
    public async registerAward(userId: string) {
        const status = await this.dictService.get("registerAwardStatus", 0, "award");
        const registerAward = await this.dictService.get("registerAward", 0, "award");
        if (1 !== status || registerAward <= 0) {
            return false;
        }
        await this.userRepository.manager.transaction(async (entityManager) => {
            const user = await entityManager.findOne(User, {
                where: {
                    id: userId,
                },
            });
            if (!user) {
                return false;
            }
            // await entityManager.increment(User, { id: userId }, "power", registerAward);
            //记录用户余额变动
            await this.appBillingService.addUserPower(
                {
                    userId: user.id,
                    amount: registerAward,
                    accountType: ACCOUNT_LOG_TYPE.REGISTER_AWARD_INC,
                    source: {
                        type: ACCOUNT_LOG_SOURCE.REGISTER_AWARD,
                        source: "注册奖励",
                    },
                    remark: `注册奖励：${registerAward}`,
                },
                entityManager,
            );
            return true;
        });
    }
    /**
     * 登录奖励
     * @param userId
     * @returns
     */
    public async loginAward(userId: string) {
        const { status, loginAward } = await this.getLoginAward();
        if (!status || !loginAward) {
            return false;
        }
        if (1 !== status) {
            return false;
        }
        const cacheKey = this.LOGIN_CACHE_PREFIX + userId;
        const lockAcquired = await this.cacheService.setnx(
            cacheKey,
            "1",
            this.getSecondsUntilTomorrow(),
        );
        if (!lockAcquired) {
            return false;
        }
        const hasTodayLoginAward = await this.hasTodayLoginAwardRecord(userId);
        if (hasTodayLoginAward) {
            return false;
        }
        const loginAwardValue = await this.resolveLoginAward(userId, loginAward);
        if (loginAwardValue <= 0) {
            await this.cacheService.del(cacheKey);
            return false;
        }
        try {
            const awarded = await this.userRepository.manager.transaction(async (entityManager) => {
                const user = await entityManager.findOne(User, {
                    where: {
                        id: userId,
                    },
                });
                if (!user) {
                    return false;
                }
                // await entityManager.increment(User, { id: userId }, "power", loginAward);
                const tomorrow = new Date();
                tomorrow.setHours(24, 0, 0, 0);
                await this.appBillingService.addUserPower(
                    {
                        userId: user.id,
                        amount: loginAwardValue,
                        accountType: ACCOUNT_LOG_TYPE.LOGIN_AWARD_INC,
                        source: {
                            type: ACCOUNT_LOG_SOURCE.LOGIN_AWARD,
                            source: "登录奖励",
                        },
                        remark: `登录奖励：${loginAwardValue}`,
                        expireAt: tomorrow,
                    },
                    entityManager,
                );
                return true;
            });
            if (!awarded) {
                await this.cacheService.del(cacheKey);
            }
            return awarded;
        } catch (error) {
            await this.cacheService.del(cacheKey);
            throw error;
        }
    }

    /**
     * 获取用户是否已登录奖励
     * @param userId
     * @returns
     */
    private async hasTodayLoginAwardRecord(userId: string): Promise<boolean> {
        const { start, end } = this.getTodayRange();
        const existing = await this.accountLogRepository.findOne({
            where: {
                userId,
                accountType: ACCOUNT_LOG_TYPE.LOGIN_AWARD_INC,
                createdAt: Between(start, end),
            },
            select: ["id"],
        });
        return Boolean(existing);
    }

    /**
     * 获取登录奖励配置
     */
    public async getLoginAward(): Promise<{ status: number; loginAward: unknown }> {
        const cachedConfig = await this.cacheService.get<string>(LOGIN_CONFIG_CACHE_PREFIX);
        if (cachedConfig) {
            const parsedConfig = this.parseLoginAwardCache(cachedConfig);
            if (parsedConfig) {
                return parsedConfig;
            }
        }
        //查询数据库，设置缓存
        const status = await this.dictService.get("loginAwardStatus", 0, "award");
        const loginAwardConfig = await this.dictService.get("loginAward", 0, "award");
        const normalizedConfig = {
            status: Number(status ?? 0),
            loginAward: loginAwardConfig,
        };
        await this.cacheService.set(LOGIN_CONFIG_CACHE_PREFIX, JSON.stringify(normalizedConfig));
        return normalizedConfig;
    }

    /**
     * 解析登录奖励配置
     * @param userId
     * @param loginAwardConfig
     * @returns
     */
    public async resolveLoginAward(userId: string, loginAwardConfig: unknown): Promise<number> {
        if (typeof loginAwardConfig === "number") {
            return Number.isFinite(loginAwardConfig) ? loginAwardConfig : 0;
        }

        if (!Array.isArray(loginAwardConfig)) {
            return 0;
        }

        const normalizedAwards = loginAwardConfig
            .map((item) => ({
                id: String((item as { id?: unknown })?.id ?? ""),
                level: String((item as { level?: unknown })?.level ?? ""),
                award: Number((item as { award?: unknown })?.award ?? 0),
            }))
            .filter((item) => item.id || item.level);

        if (normalizedAwards.length === 0) {
            return 0;
        }
        const normalUserAward = normalizedAwards.find(
            (item) => item.id === "0" || item.id === "" || item.level === "0",
        );
        const resolvedNormalUserAward =
            normalUserAward && Number.isFinite(normalUserAward.award) && normalUserAward.award > 0
                ? normalUserAward.award
                : 0;
        //用户当前等级
        const subscriptions = await this.userSubscriptionRepository.find({
            where: {
                userId,
                endTime: MoreThan(new Date()),
            },
            select: ["levelId"],
        });

        const levelIds = [...new Set(subscriptions.map((item) => item.levelId).filter(Boolean))];
        if (levelIds.length === 0) {
            return resolvedNormalUserAward;
        }
        //查询最高等级
        const highestLevel = await this.membershipLevelsRepository.findOne({
            where: { id: In(levelIds) },
            order: { level: "DESC" },
            select: ["id", "level"],
        });

        if (!highestLevel) {
            return resolvedNormalUserAward;
        }
        //查询最高等级的奖励
        const matched = normalizedAwards.find(
            (item) =>
                item.id === String(highestLevel.id) || item.level === String(highestLevel.level),
        );

        if (!matched || !Number.isFinite(matched.award) || matched.award <= 0) {
            return 0;
        }

        return matched.award;
    }

    /**
     * 解析登录奖励配置缓存值
     * @param cacheValue
     * @returns
     */
    private parseLoginAwardCache(
        cacheValue: string,
    ): { status: number; loginAward: unknown } | null {
        try {
            const parsed = JSON.parse(cacheValue) as {
                status?: unknown;
                loginAward?: unknown;
            };
            return {
                status: Number(parsed.status ?? 0),
                loginAward: parsed.loginAward ?? 0,
            };
        } catch {
            return null;
        }
    }

    /**
     * 获取到明天的秒数
     */
    private getSecondsUntilTomorrow(): number {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setHours(24, 0, 0, 0);
        return Math.max(1, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
    }

    private getTodayRange(): { start: Date; end: Date } {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(24, 0, 0, 0);
        return { start, end };
    }

    /**
     * 签到奖励
     * @param userId
     * @returns
     */
    public async signAward(userId: string) {
        const status = await this.dictService.get("signAwardStatus", 0, "award");
        const signAward = await this.dictService.get("signAward", 0, "award");
        if (1 !== status || signAward <= 0) {
            return false;
        }
        await this.userRepository.manager.transaction(async (entityManager) => {
            const user = await entityManager.findOne(User, {
                where: {
                    id: userId,
                },
            });
            if (!user) {
                return false;
            }
            await entityManager.increment(User, { id: userId }, "power", signAward);
            //记录用户余额变动
            await this.appBillingService.addUserPower(
                {
                    userId: user.id,
                    amount: signAward,
                    accountType: ACCOUNT_LOG_TYPE.SIGN_AWARD_INC,
                    source: {
                        type: ACCOUNT_LOG_SOURCE.SIGN_AWARD,
                        source: "签到奖励",
                    },
                    remark: `签到奖励：${signAward}`,
                },
                entityManager,
            );
            return true;
        });
    }
}
