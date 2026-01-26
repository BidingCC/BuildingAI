import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { UserSubscription } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Injectable, Param } from "@nestjs/common";

/**
 * Public user services
 */
@Injectable()
export class PublicUserService {
    private readonly baseService: BaseService<User>;
    /**
     * Constructor
     *
     * @param userRepository User repository
     */
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(UserSubscription)
        private readonly userSubscriptionRepository: Repository<UserSubscription>,
    ) {
        this.baseService = new BaseService<User>(this.userRepository);
    }

    /**
     * Find user by id
     *
     * @param id User id
     * @returns User info
     */
    async findUserById(@Param("id", UUIDValidationPipe) id: string) {
        const result = await this.baseService.findOneById(id, {
            excludeFields: ["password", "openid"],
            relations: ["role"],
        });

        if (!result) {
            throw HttpErrorFactory.notFound("User not found");
        }
        return result;
    }

    /**
     * 查询用户最高等级且未过期的订阅信息
     *
     * @param userId 用户ID
     * @returns 用户最高等级的有效订阅，如果没有则返回 null
     */
    async findUserSubscriptionByUserId(@Param("userId", UUIDValidationPipe) userId: string) {
        const now = new Date();

        // 查询用户所有未过期且有等级信息的订阅
        const subscriptions = await this.userSubscriptionRepository.find({
            where: {
                userId,
            },
            relations: ["level"],
        });

        // 过滤出未过期且有等级信息的订阅
        const validSubscriptions = subscriptions.filter((sub) => sub.level && sub.endTime >= now);

        if (validSubscriptions.length === 0) {
            return null;
        }

        // 按等级降序排序，取最高等级
        const highestSubscription = validSubscriptions.sort(
            (a, b) => b.level!.level - a.level!.level,
        )[0];

        return highestSubscription;
    }
}
