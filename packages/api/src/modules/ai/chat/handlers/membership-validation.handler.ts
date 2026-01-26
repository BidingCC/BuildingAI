import { BusinessCode } from "@buildingai/constants/shared/business-code.constant";
import { AiModel, UserSubscription } from "@buildingai/db/entities";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";

/**
 * 会员等级验证结果
 */
export interface MembershipValidationResult {
    /** 是否有权限访问 */
    hasAccess: boolean;
    /** 用户当前的会员等级ID列表 */
    userLevelIds: string[];
    /** 用户最高会员等级 */
    maxLevel: number;
}

/**
 * Membership Validation Command Handler
 *
 * 处理模型的会员等级权限验证
 */
@Injectable()
export class MembershipValidationCommandHandler {
    private readonly logger = new Logger(MembershipValidationCommandHandler.name);

    constructor(
        @InjectRepository(UserSubscription)
        private readonly userSubscriptionRepository: Repository<UserSubscription>,
    ) {}

    /**
     * 获取用户当前有效的会员等级信息
     *
     * @param userId 用户ID
     * @returns 用户会员等级ID列表和最高等级
     */
    async getUserMembershipInfo(userId: string): Promise<{ levelIds: string[]; maxLevel: number }> {
        const now = new Date();

        // 查询用户所有有效的订阅
        const subscriptions = await this.userSubscriptionRepository.find({
            where: {
                userId,
                endTime: MoreThan(now),
            },
            relations: ["level"],
        });

        if (subscriptions.length === 0) {
            return { levelIds: [], maxLevel: 0 };
        }

        // 过滤出有效的订阅（有 level 信息的）
        const validSubscriptions = subscriptions.filter((sub) => sub.level);

        if (validSubscriptions.length === 0) {
            return { levelIds: [], maxLevel: 0 };
        }

        // 收集所有会员等级ID
        const levelIds = validSubscriptions.map((sub) => sub.levelId!);

        // 获取最高等级
        const maxLevel = Math.max(...validSubscriptions.map((sub) => sub.level?.level ?? 0));

        return { levelIds, maxLevel };
    }

    /**
     * 验证用户是否有权限使用指定模型
     *
     * @param userId 用户ID
     * @param model 模型实体（需要包含 membershipLevels 关联）
     * @returns 验证结果
     */
    async validateModelAccess(userId: string, model: AiModel): Promise<MembershipValidationResult> {
        // 如果模型没有设置会员等级限制，则所有用户都可以访问
        const requiredLevelIds = model.membershipLevel || [];

        if (requiredLevelIds.length === 0) {
            return {
                hasAccess: true,
                userLevelIds: [],
                maxLevel: 0,
            };
        }

        // 获取用户会员信息
        const { levelIds: userLevelIds, maxLevel } = await this.getUserMembershipInfo(userId);

        // 检查用户是否拥有任一所需的会员等级
        const hasAccess = requiredLevelIds.some((levelId) => userLevelIds.includes(levelId));

        return {
            hasAccess,
            userLevelIds,
            maxLevel,
        };
    }

    /**
     * 验证用户是否有权限使用指定模型，如果没有权限则抛出异常
     *
     * @param userId 用户ID
     * @param model 模型实体
     * @throws HttpErrorFactory.forbidden 如果用户没有权限
     */
    async validateModelAccessOrThrow(userId: string, model: AiModel): Promise<void> {
        const result = await this.validateModelAccess(userId, model);

        if (!result.hasAccess) {
            this.logger.warn(
                `用户 ${userId} 尝试访问需要会员权限的模型 ${model.name}，但没有足够的会员等级`,
            );
            throw HttpErrorFactory.forbidden(
                "该模型需要相应会员权限才能使用",
                BusinessCode.MEMBERSHIP_REQUIRED,
            );
        }
    }
}
