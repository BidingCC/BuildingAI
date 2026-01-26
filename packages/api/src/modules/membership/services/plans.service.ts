import { BaseService } from "@buildingai/base";
import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import {
    MembershipLevels,
    MembershipPlans,
    Payconfig,
    User,
    UserSubscription,
} from "@buildingai/db/entities";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import { CreatePlansDto } from "../dto/create-plans.dto";
import { QueryPlansDto } from "../dto/query-plans.dto";
import { SetPlansDto } from "../dto/set-plans.dto";
import { UpdatePlansDto } from "../dto/update-plans.dto";
import { UpdatePlansSortDto } from "../dto/update-plans-sort.dto";

@Injectable()
export class PlansService extends BaseService<MembershipPlans> {
    constructor(
        private readonly dictService: DictService,
        @InjectRepository(MembershipPlans)
        private readonly membershipPlansRepository: Repository<MembershipPlans>,
        @InjectRepository(MembershipLevels)
        private readonly membershipLevelsRepository: Repository<MembershipLevels>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(UserSubscription)
        private readonly userSubscriptionRepository: Repository<UserSubscription>,
        @InjectRepository(Payconfig)
        private readonly payconfigRepository: Repository<Payconfig>,
    ) {
        super(membershipPlansRepository);
    }

    /**
     * 新增订阅计划
     */
    async createPlans(createPlansDto: CreatePlansDto) {
        try {
            const { name, label, durationConfig, duration, billing } = createPlansDto;
            const membershipPlans = this.membershipPlansRepository.create({
                name,
                label,
                durationConfig,
                duration,
                billing,
            });
            return this.membershipPlansRepository.save(membershipPlans);
        } catch (error) {
            throw HttpErrorFactory.badRequest(error.message);
        }
    }

    /**
     * 获取订阅计划配置
     */
    async getConfig(id?: string) {
        const plansStatus = await this.dictService.get(
            "membership_plans_status",
            false,
            "membership_config",
        );

        if (id) {
            const plans = await this.membershipPlansRepository.find({
                where: { status: true },
                select: ["id", "name"],
                order: { sort: "DESC", createdAt: "DESC" },
            });
            return plans;
        }
        const plans = await this.membershipPlansRepository.find({
            select: ["id", "name", "durationConfig", "status", "sort", "billing", "duration"],
            order: { sort: "DESC", createdAt: "DESC" },
        });

        // 动态计算 levelCount，并拉平 levels 的 Promise
        const plansWithLevelCount = await Promise.all(
            plans.map(async (plan) => {
                const levels =
                    (await Promise.all(
                        plan.billing?.map((item) =>
                            this.membershipLevelsRepository.findOne({
                                where: { id: item.levelId },
                            }),
                        ) ?? [],
                    )) ?? [];

                return {
                    id: plan.id,
                    name: plan.name,
                    durationConfig: plan.durationConfig,
                    duration: plan.duration,
                    status: plan.status,
                    sort: plan.sort,
                    levelCount: plan.billing?.length ?? 0,
                    levels,
                };
            }),
        );

        return {
            plansStatus,
            plans: plansWithLevelCount,
        };
    }

    /**
     * 修改订阅计划
     */
    async updatePlans(id: string, updatePlansDto: UpdatePlansDto) {
        try {
            const existPlans = await this.membershipPlansRepository.findOne({
                where: { id },
            });
            if (!existPlans) {
                throw HttpErrorFactory.notFound("订阅计划不存在");
            }
            Object.assign(existPlans, updatePlansDto);
            return this.membershipPlansRepository.save(existPlans);
        } catch (error) {
            throw HttpErrorFactory.badRequest(error.message);
        }
    }

    /**
     * 修改订阅计划排序
     */
    async updateSort(id: string, updatePlansSortDto: UpdatePlansSortDto) {
        try {
            const existPlans = await this.membershipPlansRepository.findOne({
                where: { id },
            });
            if (!existPlans) {
                throw HttpErrorFactory.notFound("订阅计划不存在");
            }
            existPlans.sort = updatePlansSortDto.sort;
            return this.membershipPlansRepository.save(existPlans);
        } catch (error) {
            throw HttpErrorFactory.badRequest(error.message);
        }
    }

    /**
     * 获取订阅计划详情
     */
    async detail(id: string) {
        const membershipPlans = await this.membershipPlansRepository.findOne({
            where: { id },
        });

        if (!membershipPlans) {
            throw HttpErrorFactory.notFound("订阅计划不存在");
        }

        return membershipPlans;
    }

    /**
     * 设置订阅计划配置
     */
    async setConfig(setPlansDto: SetPlansDto) {
        try {
            const { status } = setPlansDto;
            return this.dictService.set("membership_plans_status", status, {
                group: "membership_config",
                description: "会员功能状态",
            });
        } catch (error) {
            throw HttpErrorFactory.badRequest(error.message);
        }
    }

    /**
     * 设置订阅计划状态
     */
    async setPlanStatus(id: string, setPlansDto: SetPlansDto) {
        try {
            const { status } = setPlansDto;
            const membershipPlans = await this.membershipPlansRepository.findOne({
                where: { id },
            });
            if (!membershipPlans) {
                throw HttpErrorFactory.notFound("订阅计划不存在");
            }
            membershipPlans.status = status;
            return this.membershipPlansRepository.save(membershipPlans);
        } catch (error) {
            throw HttpErrorFactory.badRequest(error.message);
        }
    }

    /**
     * 删除订阅计划
     */
    async remove(id: string) {
        const existPlans = await this.membershipPlansRepository.findOne({
            where: { id },
        });

        if (!existPlans) {
            throw HttpErrorFactory.notFound("订阅计划不存在");
        }

        return this.membershipPlansRepository.remove(existPlans);
    }

    /**
     * 获取会员中心信息
     * @param query 查询参数
     * @param userId 用户ID
     * @returns 用户信息、最高等级订阅信息、订阅套餐列表
     */
    async center(query: QueryPlansDto, userId: string) {
        const { id } = query;

        // 并行查询用户信息、订阅计划和用户订阅记录
        const [user, membershipStatus, plans, subscriptions] = await Promise.all([
            this.userRepository.findOne({
                where: { id: userId },
                select: ["id", "userNo", "username", "avatar", "power"],
            }),
            // 会员状态
            this.dictService.get("membership_plans_status", false, "membership_config"),
            this.membershipPlansRepository.find({
                where: id ? { id, status: true } : { status: true },
                select: [
                    "id",
                    "name",
                    "label",
                    "durationConfig",
                    "status",
                    "sort",
                    "billing",
                    "duration",
                ],
                order: { sort: "DESC", createdAt: "DESC" },
            }),
            this.userSubscriptionRepository.find({
                where: { userId },
                select: ["id", "startTime", "endTime"],
                relations: ["level"],
                order: { endTime: "DESC" },
            }),
        ]);

        // 获取用户未过期的最高等级订阅信息
        let userSubscription = null;
        if (subscriptions.length > 0) {
            const now = new Date();

            // 过滤出未过期且有 level 信息的订阅
            const validSubscriptions = subscriptions.filter(
                (sub) => sub.level && sub.endTime > now,
            );

            if (validSubscriptions.length > 0) {
                // 按等级级别降序排序，取最高等级
                const highestSubscription = validSubscriptions.sort(
                    (a, b) => b.level!.level - a.level!.level,
                )[0];

                userSubscription = {
                    id: highestSubscription.id,
                    level: highestSubscription.level,
                    startTime: highestSubscription.startTime,
                    endTime: highestSubscription.endTime,
                };
            }
        }

        // 收集所有套餐中的 levelId
        const levelIds = new Set<string>();
        plans.forEach((plan) => {
            plan.billing?.forEach((item) => {
                if (item.levelId) {
                    levelIds.add(item.levelId);
                }
            });
        });

        // 批量查询会员等级信息
        const levels = await this.membershipLevelsRepository.find({
            where: {
                id: In(Array.from(levelIds)),
            },
            select: ["id", "name", "icon", "level", "givePower", "benefits", "description"],
        });
        const levelMap = new Map(levels.map((level) => [level.id, level]));

        // 将会员等级信息拼接到套餐的 billing 中
        const plansWithLevels = plans.map((plan) => ({
            ...plan,
            billing: plan.billing?.map((item) => ({
                ...item,
                level: levelMap.get(item.levelId) || null,
            })),
        }));
        const payWayList = await this.payconfigRepository.find({
            where: {
                isEnable: BooleanNumber.YES,
            },
            select: ["name", "payType", "logo"],
        });

        return {
            user,
            membershipStatus,
            userSubscription,
            plans: plansWithLevels,
            payWayList,
        };
    }
}
