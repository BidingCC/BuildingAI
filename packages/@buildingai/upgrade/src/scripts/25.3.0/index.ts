import { BooleanNumber, PayConfigPayType } from "@buildingai/constants";
import { Menu, Payconfig } from "@buildingai/db/entities";
import { MenuSourceType, MenuType } from "@buildingai/db/entities";
import type { EntityManager, Repository } from "typeorm";

import { BaseUpgradeScript, UpgradeContext } from "../../index";

class Upgrade extends BaseUpgradeScript {
    version = "25.3.0";

    async execute(context: UpgradeContext) {
        try {
            await context.dataSource.transaction(async (manager) => {
                await this.createAlipay(manager);
                await this.createMenus(manager);
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

    private async createMenus(manager: EntityManager) {
        const repo = manager.getRepository(Menu);
        await this.createNotificationMenu(repo);
    }

    private async createNotificationMenu(repo: Repository<Menu>) {
        let notificationMenu = await repo.findOne({ where: { code: "notification" } });
        if (!notificationMenu) {
            const systemManageMenu = await repo.findOne({ where: { code: "system-manage" } });
            if (!systemManageMenu) {
                throw new Error("No system management found");
            }
            notificationMenu = repo.create({
                name: "console-menu.notification.title",
                code: "notification",
                path: "notification",
                icon: "i-lucide-bell",
                sort: 1150,
                isHidden: 0,
                type: MenuType.DIRECTORY,
                parentId: systemManageMenu.id,
                sourceType: MenuSourceType.SYSTEM,
            });
            await repo.save(notificationMenu);
        }

        // Create SmsConfig menu
        const smsConfigMenu = repo.create({
            name: "console-menu.notification.sms-config",
            code: "sms-config",
            path: "sms-config",
            icon: "",
            component: "/console/notification/channels/sms-config/index",
            permissionCode: "sms-config:list",
            sort: 0,
            isHidden: 0,
            type: MenuType.MENU,
            parentId: notificationMenu.id,
            sourceType: MenuSourceType.SYSTEM,
        });
        await repo.save(smsConfigMenu);
    }
}

export default Upgrade;
