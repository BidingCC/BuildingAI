import { Dict } from "../../entities/dict.entity";
import { DataSource } from "../../typeorm";
import { BaseSeeder } from "./base.seeder";

export class AppsDecorateSeeder extends BaseSeeder {
    readonly name = "AppsDecorateSeeder";
    readonly priority = 90;

    private readonly appsDecorateConfig = {
        enabled: true,
        title: "广告",
        link: {
            type: "custom",
            path: "https://www.baidu.com/",
            name: "https://www.baidu.com/",
        },
        heroImageUrl: "static/images/apps_decorate.jpg",
    };

    async run(dataSource: DataSource): Promise<void> {
        const dictRepository = dataSource.getRepository(Dict);

        try {
            // 初始化应用中心装饰数据
            await this.initAppsDecorate(dictRepository);

            this.logSuccess("Apps decorate data initialized successfully");
        } catch (error) {
            this.logError(`Apps decorate initialization failed: ${error.message}`);
            throw error;
        }
    }

    private async initAppsDecorate(
        dictRepository: ReturnType<DataSource["getRepository"]>,
    ): Promise<void> {
        const key = "apps_decorate_config";
        const group = "apps_decorate";

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
            value: this.appsDecorateConfig,
            group,
            description: "apps_decorate 配置",
            isEnabled: true,
            sort: 0,
        });

        await dictRepository.save(config);
        this.logInfo(`Created config: ${key} in group ${group}`);
    }
}
