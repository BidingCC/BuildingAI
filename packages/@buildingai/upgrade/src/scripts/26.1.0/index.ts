import { StorageType } from "@buildingai/constants/shared/storage-config.constant";
import { Menu, MenuSourceType, MenuType, Permission, StorageConfig } from "@buildingai/db/entities";
import { In } from "@buildingai/db/typeorm";

import { BaseUpgradeScript, type UpgradeContext } from "../../index";

/**
 * Core upgrade script for version 26.1.0
 *
 * - Ensures a Tencent COS storage option row exists in `storage_config`
 * - Normalizes console menu paths for agent and datasets list entries
 * - Adds missing console menu for PM2 log rotate (system settings)
 */
export default class Upgrade extends BaseUpgradeScript {
    readonly version = "26.1.0";

    /**
     * Runs data fixes for 26.1.0
     *
     * @param context - Upgrade context (DB and services)
     */
    async execute(context: UpgradeContext): Promise<void> {
        this.log("Starting upgrade to version 26.1.0");

        try {
            await this.ensureCosStorageConfig(context);
            await this.normalizeAgentAndDatasetMenuPaths(context);
            await this.ensurePm2LogRotateMenu(context);
            this.success("Upgrade 26.1.0 completed");
        } catch (error) {
            this.error("Upgrade 26.1.0 failed", error);
            throw error;
        }
    }

    /**
     * Inserts default COS storage row when missing (`storage_type` cos, `sort` 1, `config` null).
     *
     * @param context - Upgrade context
     */
    private async ensureCosStorageConfig(context: UpgradeContext): Promise<void> {
        const repo = context.dataSource.getRepository(StorageConfig);
        const existing = await repo.findOne({ where: { storageType: StorageType.COS } });
        if (existing) {
            this.log("storage_config already has COS row, skip insert");
            return;
        }

        await repo.insert({
            storageType: StorageType.COS,
            sort: 1,
            config: null,
        });
        this.log("Inserted COS storage_config row (sort=1, config=null)");
    }

    /**
     * Sets `path` to `/` for menus `ai-agent-list` and `ai-datasets-list`.
     *
     * @param context - Upgrade context
     */
    private async normalizeAgentAndDatasetMenuPaths(context: UpgradeContext): Promise<void> {
        const repo = context.dataSource.getRepository(Menu);
        const result = await repo.update(
            { code: In(["ai-agent-list", "ai-datasets-list"]) },
            { path: "/" },
        );
        this.log(`Updated menu paths (affected rows: ${result.affected ?? 0})`);
    }

    /**
     * Adds the console menu item for PM2 log rotate under `system-settings`.
     * Skips if the menu already exists.
     *
     * @param context - Upgrade context
     */
    private async ensurePm2LogRotateMenu(context: UpgradeContext): Promise<void> {
        const repo = context.dataSource.getRepository(Menu);

        const existing = await repo.findOne({ where: { code: "system-pm2-log-rotate" } });
        if (existing) {
            this.log("menus already has system-pm2-log-rotate, skip insert");
            return;
        }

        const parent = await repo.findOne({ where: { code: "system-settings" } });
        if (!parent) {
            this.log("menus missing parent system-settings, skipping system-pm2-log-rotate insert");
            return;
        }

        const permissionCode = await this.getExistingPermissionCodeOrUndefined(
            context,
            "pm2:get-log-rotate-config",
        );

        await repo.insert({
            name: "日志切割",
            code: "system-pm2-log-rotate",
            path: "pm2-log-rotate",
            icon: "",
            component: "/console/system/pm2-log-rotate/index",
            ...(permissionCode ? { permissionCode } : {}),
            sort: 110,
            isHidden: 0,
            type: MenuType.MENU,
            sourceType: MenuSourceType.SYSTEM,
            parentId: parent.id,
        });

        this.log("Inserted menus system-pm2-log-rotate under system-settings");
    }

    /**
     * Ensures the permission exists to avoid FK violations on `menus.permissionCode -> permissions.code`.
     *
     * @param context - Upgrade context
     * @param code - Permission code to verify
     * @returns The code if it exists, otherwise undefined
     */
    private async getExistingPermissionCodeOrUndefined(
        context: UpgradeContext,
        code: string,
    ): Promise<string | undefined> {
        const permissionRepo = context.dataSource.getRepository(Permission);
        const permission = await permissionRepo.findOne({ where: { code } });
        if (permission) return code;
        this.log(`permissions missing ${code}, omit menus.permissionCode to avoid FK error`);
        return undefined;
    }
}
