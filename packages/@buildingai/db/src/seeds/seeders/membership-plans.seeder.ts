import { DataSource } from "../../typeorm";
import { MembershipLevels } from "./../../entities/membership-levels.entity";
import {
    Billing,
    Duration,
    MembershipPlanDuration,
    MembershipPlans,
} from "./../../entities/membership-plans.entity";
import { BaseSeeder } from "./base.seeder";

/**
 * 订阅计划数据配置
 */
interface MembershipPlanConfig {
    name: string;
    durationConfig: MembershipPlanDuration;
    label?: string;
    sort: number;
    duration?: Duration;
}

/**
 * 订阅计划 Seeder
 *
 * 初始化订阅计划数据
 * 依赖: MembershipLevelsSeeder 必须先执行
 */
export class MembershipPlansSeeder extends BaseSeeder {
    readonly name = "MembershipPlansSeeder";
    readonly priority = 70;

    /**
     * 订阅计划配置数据
     */
    private readonly planConfigs: MembershipPlanConfig[] = [
        {
            name: "7天体验",
            durationConfig: MembershipPlanDuration.CUSTOM,
            sort: 4,
            duration: {
                value: 7,
                unit: "day",
            },
        },
        {
            name: "单月购买",
            durationConfig: MembershipPlanDuration.MONTH,
            sort: 3,
        },
        {
            name: "按季",
            durationConfig: MembershipPlanDuration.QUARTER,
            label: "5折",
            sort: 2,
        },
        {
            name: "按年",
            durationConfig: MembershipPlanDuration.YEAR,
            label: "",
            sort: 1,
        },
    ];

    async run(dataSource: DataSource): Promise<void> {
        const planRepository = dataSource.getRepository(MembershipPlans);
        const levelRepository = dataSource.getRepository(MembershipLevels);

        try {
            // 获取所有会员等级
            const levels = await levelRepository.find({
                order: { level: "ASC" },
            });

            if (levels.length === 0) {
                this.logWarn("No membership levels found, skipping billing initialization");
            }

            let createdCount = 0;
            let updatedCount = 0;

            // 不同订阅计划与会员等级对应的售价配置
            const priceTable: Record<string, Record<number, number>> = {
                "7天体验": {
                    1: 0.01,
                    2: 0.02,
                    3: 0.03,
                },
                单月购买: {
                    1: 19,
                    2: 59,
                    3: 199,
                },
                按季: {
                    1: 49,
                    2: 99,
                    3: 299,
                },
                按年: {
                    1: 79,
                    2: 239,
                    3: 649,
                },
            };

            for (const config of this.planConfigs) {
                // 检查订阅计划是否已存在
                let plan = await planRepository.findOne({
                    where: { name: config.name },
                });

                // 为每个会员等级生成 billing 配置（根据计划名称和等级设置售价与推荐标记）
                const billing: Billing[] = levels.map((level) => {
                    const planPrices = priceTable[config.name] || {};
                    const salesPrice = planPrices[level.level] ?? 0;

                    // 根据规则设置推荐标签：
                    // - 单月购买、按季：所有等级为“推荐”
                    // - 按年：仅等级 3 为“推荐”，其余为空
                    let label = "";
                    if (config.name === "单月购买" || config.name === "按季") {
                        label = "推荐";
                    } else if (config.name === "按年" && level.level === 3) {
                        label = "推荐";
                    }

                    return {
                        levelId: level.id,
                        salesPrice,
                        status: true,
                        label,
                    };
                });

                // 准备订阅计划数据
                const planData = {
                    name: config.name,
                    durationConfig: config.durationConfig,
                    label: config.label,
                    sort: config.sort,
                    billing,
                    duration: config.duration,
                };

                if (!plan) {
                    // 创建新的订阅计划
                    plan = await planRepository.save(planData);
                    this.logInfo(`Created membership plan: ${plan.name}`);
                    createdCount++;
                } else {
                    // 更新已存在的订阅计划
                    await planRepository.update(plan.id, planData);
                    this.logInfo(`Updated membership plan: ${plan.name}`);
                    updatedCount++;
                }
            }

            this.logSuccess(
                `Membership plans initialized: created ${createdCount}, updated ${updatedCount}`,
            );
        } catch (error) {
            this.logError(`Membership plans initialization failed: ${error.message}`);
            throw error;
        }
    }
}
