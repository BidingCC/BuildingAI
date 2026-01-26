import { BaseService } from "@buildingai/base";
import { MembershipLevels, UserSubscription } from "@buildingai/db/entities";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Like, MoreThan, Repository } from "typeorm";

import { CreateLevelsDto } from "../dto/create-levels.dto";
import { QueryLevelsDto } from "../dto/query-levels.dto";
import { UpdateLevelsDto } from "../dto/update-levels.dto";

@Injectable()
export class LevelsService extends BaseService<MembershipLevels> {
    constructor(
        @InjectRepository(MembershipLevels)
        private readonly membershipLevelsRepository: Repository<MembershipLevels>,
        @InjectRepository(UserSubscription)
        private readonly userSubscriptionRepository: Repository<UserSubscription>,
    ) {
        super(membershipLevelsRepository);
    }

    /**
     * 分页查询会员等级列表
     *
     * @param queryLevelsDto 查询会员等级DTO
     * @returns 分页会员等级列表
     */
    async list(queryLevelsDto: QueryLevelsDto) {
        const { name, status } = queryLevelsDto;

        const where: any = {};

        if (name) {
            where.name = Like(`%${name}%`);
        }

        if (status !== undefined) {
            where.status = status;
        }

        const levels = await this.paginate(queryLevelsDto, {
            where,
            order: { level: "ASC" },
        });

        // 批量查询每个等级的未过期会员用户数量
        const levelIds = levels.items.map((level) => level.id);
        const accountCountMap = new Map<string, number>();

        if (levelIds.length > 0) {
            const accountCounts = await this.userSubscriptionRepository
                .createQueryBuilder("subscription")
                .select("subscription.levelId", "levelId")
                .addSelect("COUNT(DISTINCT subscription.userId)", "accountCount")
                .where("subscription.levelId IN (:...levelIds)", { levelIds })
                .andWhere("subscription.endTime > :now", { now: new Date() })
                .groupBy("subscription.levelId")
                .getRawMany<{ levelId: string; accountCount: string }>();

            accountCounts.forEach((item) => {
                accountCountMap.set(item.levelId, parseInt(item.accountCount, 10));
            });
        }

        return {
            ...levels,
            items: levels.items.map((level) => ({
                ...level,
                accountCount: accountCountMap.get(level.id) ?? 0,
            })),
        };
    }

    /**
     * 创建会员等级
     *
     * @param createLevelsDto 创建会员等级DTO
     * @returns 创建的会员等级
     */
    async createLevel(createLevelsDto: CreateLevelsDto) {
        const existLevels = await this.findOne({
            where: {
                level: createLevelsDto.level,
            },
        });

        if (existLevels) {
            throw HttpErrorFactory.badRequest("会员等级已存在");
        }

        return this.create(createLevelsDto);
    }

    /**
     * 更新会员等级
     *
     * @param id 会员等级ID
     * @param updateLevelsDto 更新会员等级DTO
     * @returns 更新后的会员等级
     */
    async updateLevels(id: string, updateLevelsDto: UpdateLevelsDto) {
        const existLevels = await this.findOneById(id);

        if (!existLevels) {
            throw HttpErrorFactory.notFound("会员等级不存在");
        }

        return this.updateById(id, updateLevelsDto);
    }

    /**
     * 删除会员等级
     *
     * @param id 会员等级ID
     * @returns 删除后的会员等级
     */
    async remove(id: string) {
        const existLevels = await this.findOneById(id);

        if (!existLevels) {
            throw HttpErrorFactory.notFound("会员等级不存在");
        }

        // 检查是否有用户关联了该会员等级且订阅未过期
        const existUserSubscription = await this.userSubscriptionRepository.findOne({
            where: {
                levelId: id,
                endTime: MoreThan(new Date()),
            },
        });

        if (existUserSubscription) {
            throw HttpErrorFactory.badRequest("存在用户关联了该会员等级且会员未过期");
        }

        return this.membershipLevelsRepository.remove(existLevels);
    }

    /**
     * 获取会员等级详情
     *
     * @param id 会员等级ID
     * @returns 会员等级详情
     */
    async detail(id: string) {
        const existLevels = await this.findOneById(id);

        if (!existLevels) {
            throw HttpErrorFactory.notFound("会员等级不存在");
        }

        return existLevels;
    }
}
