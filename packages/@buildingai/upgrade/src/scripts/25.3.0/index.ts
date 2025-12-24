import { BooleanNumber, Merchant, PayConfigPayType, PayVersion } from "@buildingai/constants";
import { Payconfig } from "@buildingai/db/entities";
import type { EntityManager } from "typeorm";

import { BaseUpgradeScript, UpgradeContext } from "../../index";

class Upgrade extends BaseUpgradeScript {
    version = "25.3.0";

    async execute(context: UpgradeContext) {
        try {
            await context.dataSource.transaction(async (manager) => {
                await this.createAlipay(manager);
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
            name: "Alipay",
            payType: PayConfigPayType.ALIPAY,
            isEnable: BooleanNumber.YES,
            isDefault: BooleanNumber.NO,
            logo: "/static/images/wxpay.png",
            sort: 1,
            payVersion: PayVersion.V3,
            merchantType: Merchant.ORDINARY,
        });

        await repo.save(payConfig);
        console.log("The payment method alipay created successfully.");
    }
}

export default Upgrade;
