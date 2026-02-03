import { Dict } from "../../entities/dict.entity";
import { DataSource } from "../../typeorm";
import { BaseSeeder } from "./base.seeder";

/**
 * 网站版权配置数据
 */
interface CopyrightConfig {
    /** 版权文本 */
    copyrightText: string;
    /** 版权品牌 */
    copyrightBrand: string;
    /** 版权链接 */
    copyrightUrl: string;
}

/**
 * 网站配置 Seeder
 *
 * 初始化网站版权备案等默认配置数据
 */
export class WebsiteSeeder extends BaseSeeder {
    readonly name = "WebsiteSeeder";
    readonly priority = 85;

    /**
     * 版权配置默认数据
     */
    private readonly copyrightConfig: CopyrightConfig = {
        copyrightText: "Powered by",
        copyrightBrand: "BuildingAI",
        copyrightUrl: "https://buildingai.cc",
    };

    async run(dataSource: DataSource): Promise<void> {
        const dictRepository = dataSource.getRepository(Dict);

        try {
            // 初始化版权配置数据
            await this.initCopyrightConfig(dictRepository);

            this.logSuccess("Website config data initialized successfully");
        } catch (error) {
            this.logError(`Website config initialization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * 初始化版权配置数据
     *
     * @param dictRepository 字典配置仓库
     */
    private async initCopyrightConfig(
        dictRepository: ReturnType<DataSource["getRepository"]>,
    ): Promise<void> {
        const group = "copyright";
        const configEntries = Object.entries(this.copyrightConfig);

        let createdCount = 0;
        let skippedCount = 0;

        for (const [key, value] of configEntries) {
            // 检查是否已存在
            const existing = await dictRepository.findOne({
                where: { key, group },
            });

            if (existing) {
                this.logInfo(`Config ${key} in group ${group} already exists, skipping`);
                skippedCount++;
                continue;
            }

            // 创建配置
            const config = dictRepository.create({
                key,
                value,
                group,
                description: `网站版权配置 - ${key}`,
                isEnabled: true,
                sort: 0,
            });

            await dictRepository.save(config);
            this.logInfo(`Created config: ${key} in group ${group}`);
            createdCount++;
        }

        this.logInfo(`Copyright config: created ${createdCount}, skipped ${skippedCount}`);
    }
}
