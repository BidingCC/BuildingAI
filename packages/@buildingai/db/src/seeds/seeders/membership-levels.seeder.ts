import { DataSource } from "../../typeorm";
import { Benefits, MembershipLevels } from "./../../entities/membership-levels.entity";
import { BaseSeeder } from "./base.seeder";

/**
 * 会员等级数据配置
 */
interface MembershipLevelConfig {
    name: string;
    level: number;
    icon: string;
    givePower: number;
    description: string;
    benefits: Benefits[];
}

/**
 * 会员等级 Seeder
 *
 * 初始化会员等级数据
 */
export class MembershipLevelsSeeder extends BaseSeeder {
    readonly name = "MembershipLevelsSeeder";
    readonly priority = 60;

    /**
     * 会员等级配置数据
     */
    private readonly levelConfigs: MembershipLevelConfig[] = [
        {
            name: "基础会员（示例）",
            level: 1,
            icon: "/static/vip/1.jpg",
            givePower: 100,
            description: "约生成10个视频或100张图片",
            benefits: [
                {
                    icon: "",
                    content: "每月赠送积分",
                },
                {
                    icon: "",
                    content: "绘画生成",
                },
                {
                    icon: "",
                    content: "视频生成",
                },
            ],
        },
        {
            name: "标准会员（示例）",
            level: 2,
            icon: "/static/vip/2.jpg",
            givePower: 500,
            description: "约生成50个视频或500张图片",
            benefits: [
                {
                    icon: "",
                    content: "每月赠送积分",
                },
                {
                    icon: "",
                    content: "绘画生成",
                },
                {
                    icon: "",
                    content: "视频生成",
                },
            ],
        },
        {
            name: "高级会员（示例）",
            level: 3,
            icon: "/static/vip/3.jpg",
            givePower: 3000,
            description: "约生成300个视频或3000张图片",
            benefits: [
                {
                    icon: "",
                    content: "每月赠送积分",
                },
                {
                    icon: "",
                    content: "绘画生成",
                },
                {
                    icon: "",
                    content: "视频生成",
                },
            ],
        },
    ];

    async run(dataSource: DataSource): Promise<void> {
        const repository = dataSource.getRepository(MembershipLevels);

        try {
            let createdCount = 0;
            let updatedCount = 0;

            for (const config of this.levelConfigs) {
                // 检查会员等级是否已存在
                let level = await repository.findOne({
                    where: { level: config.level },
                });

                // 准备会员等级数据
                const levelData = {
                    name: config.name,
                    level: config.level,
                    icon: config.icon,
                    givePower: config.givePower,
                    description: config.description,
                    benefits: config.benefits,
                };

                if (!level) {
                    // 创建新的会员等级
                    level = await repository.save(levelData);
                    this.logInfo(`Created membership level: ${level.name}`);
                    createdCount++;
                } else {
                    // 更新已存在的会员等级
                    await repository.update(level.id, levelData);
                    this.logInfo(`Updated membership level: ${level.name}`);
                    updatedCount++;
                }
            }

            this.logSuccess(
                `Membership levels initialized: created ${createdCount}, updated ${updatedCount}`,
            );
        } catch (error) {
            this.logError(`Membership levels initialization failed: ${error.message}`);
            throw error;
        }
    }
}
