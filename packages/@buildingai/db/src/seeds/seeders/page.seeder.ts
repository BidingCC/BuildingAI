import { DataSource } from "../../typeorm";
import { DecoratePageEntity } from "./../../entities/decorate-page.entity";
import { BaseSeeder } from "./base.seeder";

/**
 * Page configuration seeder
 *
 * Initializes the frontend home page menu configuration
 */
export class PageSeeder extends BaseSeeder {
    readonly name = "PageSeeder";
    readonly priority = 40;

    async run(dataSource: DataSource): Promise<void> {
        const repository = dataSource.getRepository(DecoratePageEntity);

        try {
            // Check whether the page configuration already exists
            const existingPage = await repository.findOne({
                where: { name: "web" },
            });

            if (existingPage) {
                this.logInfo("Page configuration already exists, skipping initialization");
                return;
            }

            // Create frontend home page menu configuration
            const homeMenus = {
                menus: [
                    {
                        id: "menu_1755512044425_a2764bd6-6ee5-4134-9844-6f952371e9e3",
                        icon: "i-lucide-message-square-quote",
                        link: {
                            name: "menu.chat",
                            path: "/",
                            type: "system",
                            query: {},
                        },
                        title: "对话",
                    },
                    {
                        id: "menu_1755255556893_4574a410-9f08-4c41-b73a-4a07236be704",
                        icon: "i-lucide-bot-message-square",
                        link: {
                            name: "menu.agent",
                            path: "/public/agent/square",
                            type: "system",
                            query: {},
                        },
                        title: "智能体",
                    },
                    {
                        id: "menu_1764936950052-28ca0576-854a-4272-8e26-7c1dc1159ca1",
                        icon: "i-tabler-apps",
                        link: {
                            name: "menu.apps",
                            path: "/apps",
                            type: "system",
                            query: {},
                        },
                        title: "应用中心",
                    },
                ],
                layout: "layout-5",
            };

            await repository.save({
                name: "web",
                data: homeMenus,
            });

            this.logSuccess("Page configuration initialized successfully");
        } catch (error) {
            this.logError(`Page configuration initialization failed: ${error.message}`);
            throw error;
        }
    }
}
