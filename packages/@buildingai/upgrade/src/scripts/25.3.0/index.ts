import { BooleanNumber, Merchant, PayConfigPayType, PayVersion } from "@buildingai/constants";
import { Menu, MenuSourceType, MenuType, Payconfig } from "@buildingai/db/entities";
import type { EntityManager, Repository } from "typeorm";

import { BaseUpgradeScript, UpgradeContext } from "../../index";

class Upgrade extends BaseUpgradeScript {
    version = "25.3.0";

    async execute(context: UpgradeContext) {
        try {
            await context.dataSource.transaction(async (manager) => {
                await this.createAlipay(manager);
                await this.optimizePluginMenu(manager);
                await this.updateStorageConfigMenuSort(manager);
            });
        } catch (error) {
            this.error("Upgrade to version 25.3.0 failed.", error);
            throw error;
        }
    }

    private async createAlipay(manager: EntityManager) {
        const repo = manager.getRepository(Payconfig);
        const existing = await repo.exists({ where: { payType: PayConfigPayType.ALIPAY } });
        if (existing) {
            this.log("The payment method alipay already exists, skipping.");
            return;
        }

        const payConfig = repo.create({
            name: "支付宝支付",
            payType: PayConfigPayType.ALIPAY,
            isEnable: BooleanNumber.YES,
            isDefault: BooleanNumber.NO,
            logo: "/static/images/alipay.png",
            sort: 1,
            config: null,
        });

        await repo.save(payConfig);
        console.log("The payment method alipay created successfully.");
    }

    /**
     * Optimize plugin menu structure: convert nested structure to flat structure
     * Changes from:
     *   - plugin-manage (parent with children)
     *     - plugin-my-plugins (child)
     *     - plugin-profiles (child)
     * To:
     *   - plugin-my-plugins (flat, directly under workspace)
     */
    private async optimizePluginMenu(manager: EntityManager) {
        const menuRepo = manager.getRepository(Menu);

        // Find the parent menu "plugin-manage"
        const pluginManageMenu = await menuRepo.findOne({
            where: { code: "plugin-manage" },
            relations: ["children"],
        });

        if (!pluginManageMenu) {
            this.log("Plugin menu (plugin-manage) not found, skipping optimization.");
            return;
        }

        // Find workspace menu as the new parent
        const workspaceMenu = await menuRepo.findOne({ where: { code: "workspace" } });
        if (!workspaceMenu) {
            this.log("Workspace menu not found, skipping plugin menu optimization.");
            return;
        }

        // Get children menus
        const children = pluginManageMenu.children || [];
        if (children.length === 0) {
            this.log("Plugin menu has no children, skipping optimization.");
            return;
        }

        // Update plugin-my-plugins to flat structure
        const pluginMyPluginsMenu = children.find((child) => child.code === "plugin-my-plugins");
        if (pluginMyPluginsMenu) {
            await menuRepo.update(pluginMyPluginsMenu.id, {
                parentId: workspaceMenu.id,
                path: "manage",
                icon: "i-lucide-store",
                component: "/console/plugins/manage/list",
                permissionCode: "extensions:list",
                sort: 500,
                isHidden: 0,
                type: MenuType.MENU,
                sourceType: MenuSourceType.SYSTEM,
            });
            this.log(`Updated menu plugin-my-plugins to flat structure.`);
        }

        // Delete other children menus (like plugin-profiles) if they exist
        for (const child of children) {
            if (child.code !== "plugin-my-plugins") {
                await menuRepo.remove(child);
                this.log(`Deleted child menu ${child.code}.`);
            }
        }

        // Delete the parent menu "plugin-manage"
        await menuRepo.remove(pluginManageMenu);
        this.log("Deleted parent menu plugin-manage, optimization completed.");
    }

    /**
     * Update storage config menu sort from 0 to 100
     */
    private async updateStorageConfigMenuSort(manager: EntityManager) {
        const menuRepo = manager.getRepository(Menu);

        const storageConfigMenu = await menuRepo.findOne({
            where: { code: "system-storage-config" },
        });

        if (!storageConfigMenu) {
            this.log("Storage config menu not found, skipping sort update.");
            return;
        }

        // Only update if current sort is 0
        if (storageConfigMenu.sort === 0) {
            await menuRepo.update(storageConfigMenu.id, {
                sort: 100,
            });
            this.log("Updated storage config menu sort from 0 to 100.");
        } else {
            this.log(
                `Storage config menu sort is already ${storageConfigMenu.sort}, skipping update.`,
            );
        }
    }
}

export default Upgrade;
