import { StorageType } from "@buildingai/constants";
import { Menu } from "@buildingai/db/entities";
import {
    MenuSourceType,
    MenuType,
    Permission,
    PermissionType,
    StorageConfig,
} from "@buildingai/db/entities";
import { EntityManager, Repository } from "typeorm";

import { BaseUpgradeScript, UpgradeContext } from "../../index";

interface MenuConfig {
    name: string;
    code: string;
    path: string;
    icon?: string;
    component: string;
    permissionCode?: string;
    sort: number;
    isHidden: 0 | 1;
    type: MenuType;
}

/**
 * Upgrade script 25.2.0
 */
export class Upgrade extends BaseUpgradeScript {
    readonly version = "25.2.0";

    /**
     * Execute upgrade logic.
     *
     * @param context Upgrade context.
     */
    async execute(context: UpgradeContext): Promise<void> {
        this.log("Start upgrading to version 25.2.0");

        try {
            await context.dataSource.transaction(async (manager) => {
                await this.createPermissions(manager);
                await this.createStorageConfig(manager);
                await this.createMenus(manager);
            });
        } catch (error) {
            this.error("Upgrade to version 25.2.0 failed.", error);
            throw error;
        }
    }

    private async createStorageConfig(manager: EntityManager) {
        const storageConfigs = await manager.find(StorageConfig);

        if (storageConfigs.length > 0) {
            this.log("The StorageConfig has been created and will be skipped.");
            return;
        }

        await manager.save(StorageConfig, [
            {
                storageType: StorageType.LOCAL,
                isActive: true,
                config: null,
                sort: 0,
            },
            {
                storageType: StorageType.OSS,
                isActive: false,
                config: null,
                sort: 1,
            },
        ]);
    }

    private async createMenus(manager: EntityManager) {
        const repo = manager.getRepository(Menu);
        await this.createStorageConfigMenu(repo);
    }

    private async createPermissions(manager: EntityManager) {
        const permissionRepo = manager.getRepository(Permission);

        const permissions = [
            {
                code: "system-storage-config:list",
                name: "查看存储配置",
                description: "查看系统存储配置列表",
                group: "system-storage-config",
                groupName: "存储配置",
                type: PermissionType.SYSTEM,
                isDeprecated: false,
            },
        ];

        for (const perm of permissions) {
            const existing = await permissionRepo.exists({
                where: { code: perm.code },
            });

            if (existing) {
                this.log(`Permission ${perm.code} already exists, skipping.`);
                continue;
            }

            await permissionRepo.save(permissionRepo.create(perm));
            this.log(`Permission ${perm.code} created successfully.`);
        }
    }

    private async createStorageConfigMenu(repo: Repository<Menu>) {
        const systemSettingsMenu = await repo.findOne({ where: { code: "system-settings" } });
        if (!systemSettingsMenu) {
            this.log("Parent menu system-settings not found, skipping menu creation.");
            return;
        }

        const existing = await repo.exists({ where: { code: "system-storage-config" } });
        if (existing) {
            this.log("The storage-config menu already exists, skipping.");
            return;
        }

        await this.findOrCreateMenu(
            repo,
            "system-storage-config",
            {
                name: "console-menu.systemSettings.storageConfig",
                code: "system-storage-config",
                path: "storage-config",
                component: "/console/system-setting/storage-config/index",
                permissionCode: "system-storage-config:list",
                sort: 0,
                isHidden: 0,
                type: MenuType.MENU,
            },
            systemSettingsMenu.id,
        );
    }

    private async findOrCreateMenu(
        repo: Repository<Menu>,
        code: string,
        config: MenuConfig,
        parentId: string,
    ): Promise<Menu> {
        const existing = await repo.findOne({ where: { code } });
        if (existing) {
            this.log(`Menu ${code} already exists, skipping creation.`);
            return existing;
        }

        const menu = repo.create({
            ...config,
            icon: config.icon ?? "",
            parentId,
            sourceType: MenuSourceType.SYSTEM,
        } as Partial<Menu>);

        await repo.save(menu);
        this.log(`Menu ${code} created successfully.`);
        return menu;
    }
}

export default Upgrade;
