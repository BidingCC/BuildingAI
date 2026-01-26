import { Dict } from "../../entities/dict.entity";
import { Recharge } from "../../entities/recharge.entity";
import { DataSource } from "../../typeorm";
import { BaseSeeder } from "./base.seeder";

/**
 * 充值套餐数据配置
 */
interface RechargeConfig {
    /** 充值的数量 */
    power: number;
    /** 赠送的数量 */
    givePower: number;
    /** 售价 */
    sellPrice: number;
    /** 标签 */
    label: string;
}

/**
 * 充值中心 Seeder
 *
 * 初始化充值套餐数据和充值说明配置
 */
export class RechargeCenterSeeder extends BaseSeeder {
    readonly name = "RechargeCenterSeeder";
    readonly priority = 80;

    /**
     * 充值套餐配置数据
     */
    private readonly rechargeConfigs: RechargeConfig[] = [
        {
            power: 1000,
            givePower: 10,
            sellPrice: 18,
            label: "购买人数最多",
        },
        {
            power: 3000,
            givePower: 100,
            sellPrice: 49,
            label: "强烈推荐",
        },
        {
            power: 5000,
            givePower: 200,
            sellPrice: 88,
            label: "强烈推荐",
        },
        {
            power: 50,
            givePower: 0,
            sellPrice: 0.01,
            label: "体验",
        },
    ];

    /**
     * 充值说明配置
     */
    private readonly rechargeExplain = `1.充值成功后不支持退款或反向兑换为人民币;
2.充值后的积分不会过期，但无法提现、转赠；
3.支付完成可能需要等待一会儿才能到账，如一直未到账，请联系我们；
4.用户不得通过未经得到许可的第三方渠道进行充值，不得通过恶意退费等不正当手段获取账户积分，否则由此造成的损失由用户自行承担；`;

    async run(dataSource: DataSource): Promise<void> {
        const rechargeRepository = dataSource.getRepository(Recharge);
        const dictRepository = dataSource.getRepository(Dict);

        try {
            // 初始化充值套餐数据
            await this.initRechargePackages(rechargeRepository);

            // 初始化充值状态配置
            await this.initRechargeStatusConfig(dictRepository);

            // 初始化充值说明配置
            await this.initRechargeExplainConfig(dictRepository);

            this.logSuccess("Recharge center data initialized successfully");
        } catch (error) {
            this.logError(`Recharge center initialization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * 初始化充值套餐数据
     *
     * @param rechargeRepository 充值套餐仓库
     */
    private async initRechargePackages(
        rechargeRepository: ReturnType<DataSource["getRepository"]>,
    ): Promise<void> {
        let createdCount = 0;
        let skippedCount = 0;

        for (const config of this.rechargeConfigs) {
            // 检查是否已存在相同 power 和 sellPrice 的套餐
            const existing = await rechargeRepository.findOne({
                where: {
                    power: config.power,
                    sellPrice: config.sellPrice,
                },
            });

            if (existing) {
                this.logInfo(
                    `Recharge package (power: ${config.power}, sellPrice: ${config.sellPrice}) already exists, skipping`,
                );
                skippedCount++;
                continue;
            }

            // 创建新的充值套餐
            const recharge = rechargeRepository.create(config);
            await rechargeRepository.save(recharge);
            this.logInfo(
                `Created recharge package: power=${config.power}, sellPrice=${config.sellPrice}`,
            );
            createdCount++;
        }

        this.logInfo(`Recharge packages: created ${createdCount}, skipped ${skippedCount}`);
    }

    /**
     * 初始化充值说明配置
     *
     * @param dictRepository 字典配置仓库
     */
    private async initRechargeStatusConfig(
        dictRepository: ReturnType<DataSource["getRepository"]>,
    ): Promise<void> {
        const key = "recharge_status";
        const group = "recharge_config";

        // 检查是否已存在
        const existing = await dictRepository.findOne({
            where: { key, group },
        });

        if (existing) {
            existing.value = true as unknown as string;
            existing.description = "充值功能状态";
            existing.isEnabled = true;
            await dictRepository.save(existing);
            this.logInfo(`Config ${key} in group ${group} already exists, updated value`);
            return;
        }

        // 创建充值状态配置（默认开启）
        const config = dictRepository.create({
            key,
            value: true as unknown as string,
            group,
            description: "充值功能状态",
            isEnabled: true,
            sort: 0,
        });

        await dictRepository.save(config);
        this.logInfo(`Created config: ${key} in group ${group}`);
    }

    /**
     * 初始化充值说明配置
     *
     * @param dictRepository 字典配置仓库
     */
    private async initRechargeExplainConfig(
        dictRepository: ReturnType<DataSource["getRepository"]>,
    ): Promise<void> {
        const key = "recharge_explain";
        const group = "recharge_config";

        // 检查是否已存在
        const existing = await dictRepository.findOne({
            where: { key, group },
        });

        if (existing) {
            this.logInfo(`Config ${key} in group ${group} already exists, skipping`);
            return;
        }

        // 创建充值说明配置
        const config = dictRepository.create({
            key,
            value: this.rechargeExplain,
            group,
            description: "充值说明",
            isEnabled: true,
            sort: 0,
        });

        await dictRepository.save(config);
        this.logInfo(`Created config: ${key} in group ${group}`);
    }
}
