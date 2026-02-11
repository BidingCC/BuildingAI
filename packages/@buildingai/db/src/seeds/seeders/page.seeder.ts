import { Dict } from "../../entities/dict.entity";
import { DataSource } from "../../typeorm";
import { BaseSeeder } from "./base.seeder";

const DICT_GROUP = "decorate";
const DICT_KEY = "menu-config";

/**
 * Page configuration seeder
 *
 * Initializes the frontend home page menu configuration
 */
export class PageSeeder extends BaseSeeder {
    readonly name = "PageSeeder";
    readonly priority = 40;

    async run(dataSource: DataSource): Promise<void> {
        const dictRepository = dataSource.getRepository(Dict);

        try {
            // Check whether the menu configuration already exists
            const existing = await dictRepository.findOne({
                where: { key: DICT_KEY, group: DICT_GROUP },
            });

            if (existing) {
                this.logInfo("Menu configuration already exists, skipping initialization");
                return;
            }

            // Create frontend home page menu configuration
            const menuConfig = {
                menus: [
                    {
                        id: "menu_home_fixed",
                        icon: "square-pen",
                        title: "新对话",
                        link: {
                            label: "新对话",
                            path: "/",
                            type: "system",
                            query: {},
                            component: "/src/pages/chat/index.tsx",
                            target: "_self",
                        },
                    },
                    {
                        id: "menu_app-center",
                        icon: "layout-grid",
                        title: "应用",
                        link: {
                            label: "应用",
                            path: "/apps",
                            type: "system",
                            query: {},
                            component: "/src/pages/apps/index.tsx",
                            target: "_self",
                        },
                    },
                    {
                        id: "menu_agent-center",
                        icon: "bot",
                        title: "智能体",
                        link: {
                            label: "智能体",
                            path: "/agents",
                            type: "system",
                            query: {},
                            component: "/src/pages/agents/index.tsx",
                            target: "_self",
                        },
                    },
                    {
                        id: "menu_datasets",
                        icon: "book-open-check",
                        title: "知识库",
                        link: {
                            label: "知识库",
                            path: "/datasets",
                            type: "system",
                            query: {},
                            component: "/src/pages/datasets/index.tsx",
                            target: "_self",
                        },
                    },
                    {
                        id: "menu_workflow",
                        icon: "workflow",
                        title: "工作流",
                        link: {
                            label: "工作流",
                            path: "/workflow",
                            type: "system",
                            query: {},
                            component: "/src/pages/workflow/index.tsx",
                            target: "_self",
                        },
                    },
                    {
                        id: "menu_history_fixed",
                        icon: "folder-clock",
                        title: "历史记录",
                        link: {
                            label: "历史记录",
                            path: "",
                            type: "button",
                            query: {},
                            component: null,
                            target: "_self",
                        },
                    },
                ],
                groups: [
                    {
                        id: "group_default_apps",
                        title: "应用",
                        items: [
                            {
                                id: "menu_group_extension_demo",
                                icon: "puzzle",
                                title: "扩展示例",
                                link: {
                                    label: "扩展示例",
                                    path: "#",
                                    type: "extension",
                                    query: {},
                                    component: null,
                                    target: "_self",
                                },
                            },
                        ],
                    },
                ],
                layout: "default",
            };

            const config = dictRepository.create({
                key: DICT_KEY,
                value: JSON.stringify(menuConfig),
                group: DICT_GROUP,
                description: "前台菜单配置",
                isEnabled: true,
                sort: 0,
            });

            await dictRepository.save(config);

            this.logSuccess("Menu configuration initialized successfully");
        } catch (error) {
            this.logError(`Menu configuration initialization failed: ${error.message}`);
            throw error;
        }
    }
}
