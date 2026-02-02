import {
    Merchant,
    PayConfigPayType,
    PayVersion,
} from "@buildingai/constants/shared/payconfig.constant";
import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";

import { DataSource } from "../../typeorm";
import { Payconfig } from "./../../entities/payconfig.entity";
import { BaseSeeder } from "./base.seeder";

/**
 * Payment configuration seeder
 *
 * Initializes the system default payment configuration
 */
export class PayConfigSeeder extends BaseSeeder {
    readonly name = "PayConfigSeeder";
    readonly priority = 30;

    async run(dataSource: DataSource): Promise<void> {
        const repository = dataSource.getRepository(Payconfig);

        try {
            // Check whether payment configurations already exist
            const existingCount = await repository.count();
            if (existingCount > 0) {
                this.logInfo(
                    `Detected ${existingCount} payment configurations, skipping initialization`,
                );
                return;
            }

            // Create default payment configuration
            await repository.save([
                {
                    name: "微信支付",
                    payType: PayConfigPayType.WECHAT,
                    isEnable: BooleanNumber.YES,
                    isDefault: BooleanNumber.YES,
                    logo: "/static/images/wxpay.png",
                    sort: 0,
                    config: null,
                },
                {
                    name: "支付宝支付",
                    payType: PayConfigPayType.ALIPAY,
                    isEnable: BooleanNumber.YES,
                    isDefault: BooleanNumber.NO,
                    logo: "/static/images/alipay.png",
                    sort: 1,
                    config: null,
                },
            ]);

            const count = await repository.count();
            this.logInfo(`实际插入后的记录数: ${count}`);

            this.logSuccess("Payment configuration initialized successfully");
        } catch (error) {
            this.logError(`Payment configuration initialization failed: ${error.message}`);
            throw error;
        }
    }
}
