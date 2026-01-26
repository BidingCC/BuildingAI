import { CacheService } from "@buildingai/cache";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { ExtensionFeature, UserSubscription } from "@buildingai/db/entities";
import { MoreThan, Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

/**
 * 插件功能服务
 *
 * 处理插件功能与会员等级的关联关系，提供功能访问权限验证
 */
@Injectable()
export class ExtensionFeatureService {
    private readonly logger = new Logger(ExtensionFeatureService.name);

    /**
     * 功能配置缓存过期时间（秒）
     *
     * 设置较短的缓存时间，确保配置变更能及时生效
     */
    private readonly FEATURE_CACHE_TTL = 300; // 5分钟

    /**
     * 用户会员等级缓存过期时间（秒）
     */
    private readonly USER_LEVEL_CACHE_TTL = 300; // 5分钟

    constructor(
        @InjectRepository(ExtensionFeature)
        private extensionFeatureRepository: Repository<ExtensionFeature>,
        @InjectRepository(UserSubscription)
        private userSubscriptionRepository: Repository<UserSubscription>,
        private cacheService: CacheService,
    ) {}

    /**
     * 根据功能标识符获取功能配置
     *
     * @param featureCode 功能唯一标识符
     * @returns 功能配置，包含关联的会员等级
     */
    async getFeatureByCode(featureCode: string): Promise<ExtensionFeature | null> {
        const cacheKey = `extension_feature:${featureCode}`;
        const cachedFeature = await this.cacheService.get<ExtensionFeature>(cacheKey);

        if (cachedFeature) {
            return cachedFeature;
        }

        const feature = await this.extensionFeatureRepository.findOne({
            where: { featureCode, status: true },
            relations: ["membershipLevels"],
        });

        if (feature) {
            await this.cacheService.set(cacheKey, feature, this.FEATURE_CACHE_TTL);
        }

        return feature;
    }

    /**
     * 获取功能所需的会员等级ID列表
     *
     * @param featureCode 功能唯一标识符
     * @returns 会员等级ID数组，如果功能不存在或未配置会员等级则返回空数组
     */
    async getFeatureRequiredLevelIds(featureCode: string): Promise<string[]> {
        const feature = await this.getFeatureByCode(featureCode);

        if (!feature || !feature.membershipLevels || feature.membershipLevels.length === 0) {
            return [];
        }

        return feature.membershipLevels.map((level) => level.id);
    }

    /**
     * 获取用户当前有效的会员等级ID列表
     *
     * @param userId 用户ID
     * @returns 用户当前有效的会员等级ID数组
     */
    async getUserActiveLevelIds(userId: string): Promise<string[]> {
        const cacheKey = `user_active_levels:${userId}`;
        const cachedLevelIds = await this.cacheService.get<string[]>(cacheKey);

        if (cachedLevelIds) {
            return cachedLevelIds;
        }

        const now = new Date();
        const subscriptions = await this.userSubscriptionRepository.find({
            where: {
                userId,
                endTime: MoreThan(now),
            },
            select: ["levelId"],
        });

        const levelIds = subscriptions
            .map((sub) => sub.levelId)
            .filter((id): id is string => id !== null);

        // 缓存时间较短，因为会员状态可能变化
        // await this.cacheService.set(cacheKey, levelIds, this.USER_LEVEL_CACHE_TTL);

        return levelIds;
    }

    /**
     * 检查用户是否有权限访问指定功能
     *
     * @param userId 用户ID
     * @param featureCode 功能唯一标识符
     * @returns 是否有权限访问
     *
     * @remarks
     * - 如果功能不存在，返回 true（允许访问）
     * - 如果功能存在但未配置会员等级，返回 true（允许访问）
     * - 如果功能配置了会员等级，检查用户是否拥有其中任意一个等级
     */
    async checkUserCanAccessFeature(userId: string, featureCode: string): Promise<boolean> {
        const requiredLevelIds = await this.getFeatureRequiredLevelIds(featureCode);

        // 如果功能不存在或未配置会员等级限制，允许所有用户访问
        if (requiredLevelIds.length === 0) {
            return true;
        }

        const userLevelIds = await this.getUserActiveLevelIds(userId);

        // 检查用户是否拥有任意一个所需的会员等级
        return requiredLevelIds.some((levelId) => userLevelIds.includes(levelId));
    }

    /**
     * 获取功能所需的会员等级名称列表
     *
     * @param featureCode 功能唯一标识符
     * @returns 会员等级名称数组
     */
    async getFeatureRequiredLevelNames(featureCode: string): Promise<string[]> {
        const feature = await this.getFeatureByCode(featureCode);

        if (!feature || !feature.membershipLevels || feature.membershipLevels.length === 0) {
            return [];
        }

        return feature.membershipLevels.map((level) => level.name);
    }

    /**
     * 清除功能相关的缓存
     *
     * @param featureCode 功能唯一标识符
     */
    async clearFeatureCache(featureCode: string): Promise<void> {
        await this.cacheService.del(`extension_feature:${featureCode}`);
    }

    /**
     * 清除用户会员等级相关的缓存
     *
     * @param userId 用户ID
     */
    async clearUserLevelCache(userId: string): Promise<void> {
        await this.cacheService.del(`user_active_levels:${userId}`);
    }
}
