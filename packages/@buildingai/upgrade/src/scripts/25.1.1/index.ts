import { Menu, MenuSourceType, MenuType } from "@buildingai/db/entities/menu.entity";
import { Repository } from "@buildingai/db/typeorm";

import { BaseUpgradeScript, UpgradeContext } from "../../index";

/**
 * Upgrade script 25.1.0
 *
 * Add WeChat Mini Program configuration menu item.
 *
 * Menu hierarchy:
 * - channel-wechat-mp (WeChat Mini Program)
 *   - wxmpconfig (WeChat Mini Program Configuration) <- new menu added in this version
 */
export class Upgrade extends BaseUpgradeScript {
    readonly version = "25.1.1";

    /**
     * Execute upgrade logic.
     *
     * @param context Upgrade context.
     */
    async execute(context: UpgradeContext): Promise<void> {
        this.log("Start upgrading to version 25.1.1");

        await this.addWeChatMiniProgramConfigurationMenu(context);
    }

    async addWeChatMiniProgramConfigurationMenu(context: UpgradeContext) {
        try {
            const { dataSource } = context;
            const menuRepository: Repository<Menu> = dataSource.getRepository(Menu);

            // Find parent menu channel-management (WeChat Mini Program menu)
            const parentMenu = await menuRepository.findOne({
                where: { code: "channel-management" },
            });

            if (!parentMenu) {
                this.log("Parent menu channel-management not found, skip adding menu");
                return;
            }

            // Check whether the menu already exists
            const existingMenu = await menuRepository.findOne({
                where: { code: "wxmpconfig" },
            });

            if (existingMenu) {
                this.log("Menu wxmpconfig already exists, skip adding");
                return;
            }

            // Create new menu item
            const newMenu = menuRepository.create({
                name: "console-menu.systemSettings.wechatMpConfig",
                code: "channel-wechat-mp",
                path: "wechat-mp",
                icon: "",
                component: "/console/channel/wechatmp/index",
                permissionCode: "wxmpconfig:get-config",
                parentId: parentMenu.id,
                sort: 0,
                isHidden: 0,
                type: MenuType.MENU,
                sourceType: MenuSourceType.SYSTEM,
                children: [
                    {
                        name: "console-common.update",
                        path: "",
                        icon: "",
                        component: "",
                        permissionCode: "wxmpconfig:update-config",
                        sort: 0,
                        isHidden: 0,
                        type: MenuType.BUTTON,
                        sourceType: MenuSourceType.SYSTEM,
                    },
                ],
            });
        } catch (error) {
            this.error("Upgrade failed", error);
            throw error;
        }
    }
}

export default Upgrade;
