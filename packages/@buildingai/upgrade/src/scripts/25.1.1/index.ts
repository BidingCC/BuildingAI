import { Menu, MenuSourceType, MenuType } from "@buildingai/db/entities/menu.entity";
import { Permission, PermissionType } from "@buildingai/db/entities/permission.entity";
import { DataSource, Repository } from "@buildingai/db/typeorm";

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

        const { dataSource } = context;

        // Ensure permissions exist before creating menus
        await this.ensurePermissions(dataSource);

        // Create menus
        await this.addWeChatMiniProgramConfigurationMenu(context);
        await this.addDiyCenterMobileMenu(context);
    }

    /**
     * Ensure required permissions exist, create them if they don't.
     *
     * @param dataSource Data source.
     */
    private async ensurePermissions(dataSource: DataSource): Promise<void> {
        const permissionRepository = dataSource.getRepository(Permission);

        const requiredPermissions = [
            {
                code: "wxmpconfig:get-config",
                name: "permission.wxmpconfig.getConfig",
                description: "获取微信小程序配置",
                group: "channel",
                groupName: "permission.group.channel",
            },
            {
                code: "wxmpconfig:update-config",
                name: "permission.wxmpconfig.updateConfig",
                description: "更新微信小程序配置",
                group: "channel",
                groupName: "permission.group.channel",
            },
            {
                code: "agent-decorate:get",
                name: "permission.agentDecorate.get",
                description: "获取智能体装修",
                group: "decorate",
                groupName: "permission.group.decorate",
            },
        ];

        const existingCodes = new Set(
            (await permissionRepository.find({ select: ["code"] })).map((p) => p.code),
        );

        const newPermissions = requiredPermissions
            .filter((p) => !existingCodes.has(p.code))
            .map((p) =>
                permissionRepository.create({
                    ...p,
                    type: PermissionType.SYSTEM,
                    isDeprecated: false,
                } as Partial<Permission>),
            );

        if (newPermissions.length > 0) {
            await permissionRepository.save(newPermissions);
            newPermissions.forEach((p) => this.log(`Permission ${p.code} created`));
        }
    }

    /**
     * Get permission code if exists, otherwise return null.
     *
     * @param permissionRepository Permission repository.
     * @param permissionCode Permission code to check.
     * @returns Permission code if exists, null otherwise.
     */
    private async getValidPermissionCode(
        permissionRepository: Repository<Permission>,
        permissionCode: string,
    ): Promise<string | null> {
        const permission = await permissionRepository.findOne({
            where: { code: permissionCode, isDeprecated: false },
        });

        if (!permission) {
            this.log(`Permission ${permissionCode} not found, will set to null`);
            return null;
        }

        return permissionCode;
    }

    async addWeChatMiniProgramConfigurationMenu(context: UpgradeContext) {
        try {
            const { dataSource } = context;
            const menuRepository: Repository<Menu> = dataSource.getRepository(Menu);
            const permissionRepository: Repository<Permission> =
                dataSource.getRepository(Permission);

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
                where: { code: "channel-wechat-mp" },
            });

            if (existingMenu) {
                this.log("Menu channel-wechat-mp already exists, skip adding");
                return;
            }

            // Validate permission codes
            const mainPermissionCode = await this.getValidPermissionCode(
                permissionRepository,
                "wxmpconfig:get-config",
            );
            const updatePermissionCode = await this.getValidPermissionCode(
                permissionRepository,
                "wxmpconfig:update-config",
            );

            // Create new menu item
            const newMenu = menuRepository.create({
                name: "console-menu.systemSettings.wechatMpConfig",
                code: "channel-wechat-mp",
                path: "wechat-mp",
                icon: "",
                component: "/console/channel/wechatmp/index",
                permissionCode: mainPermissionCode || undefined,
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
                        permissionCode: updatePermissionCode || undefined,
                        sort: 0,
                        isHidden: 0,
                        type: MenuType.BUTTON,
                        sourceType: MenuSourceType.SYSTEM,
                    },
                ],
            });

            await menuRepository.save(newMenu);
            this.log("Menu channel-wechat-mp added successfully");
        } catch (error) {
            this.error("Upgrade failed", error);
            throw error;
        }
    }

    /**
     * Add DIY Center Mobile menu item.
     *
     * Menu hierarchy:
     * - diy-center (DIY Center)
     *   - mobile (Mobile Decorate) <- new menu added in this version
     */
    async addDiyCenterMobileMenu(context: UpgradeContext) {
        try {
            const { dataSource } = context;
            const menuRepository: Repository<Menu> = dataSource.getRepository(Menu);
            const permissionRepository: Repository<Permission> =
                dataSource.getRepository(Permission);

            // Find parent menu diy-center
            const parentMenu = await menuRepository.findOne({
                where: { code: "diy-center" },
            });

            if (!parentMenu) {
                this.log("Parent menu diy-center not found, skip adding menu");
                return;
            }

            // Check whether the menu already exists by component path
            const existingMenu = await menuRepository.findOne({
                where: { component: "/console/decorate/mobile/index" },
            });

            if (existingMenu) {
                this.log("Menu /console/decorate/mobile/index already exists, skip adding");
                return;
            }

            // Validate permission code
            const permissionCode = await this.getValidPermissionCode(
                permissionRepository,
                "agent-decorate:get",
            );

            // Create new menu item
            const newMenu = menuRepository.create({
                name: "console-menu.diyCenter.mobile",
                code: "diy-center-mobile",
                path: "mobile",
                icon: "",
                component: "/console/decorate/mobile/index",
                permissionCode: permissionCode || undefined,
                parentId: parentMenu.id,
                sort: 0,
                isHidden: 0,
                type: MenuType.MENU,
                sourceType: MenuSourceType.SYSTEM,
            });

            await menuRepository.save(newMenu);
            this.log("Menu diy-center-mobile added successfully");
        } catch (error) {
            this.error("Failed to add diy-center-mobile menu", error);
            throw error;
        }
    }
}

export default Upgrade;
