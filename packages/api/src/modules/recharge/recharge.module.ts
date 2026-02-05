import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Payconfig } from "@buildingai/db/entities";
import { Dict } from "@buildingai/db/entities";
import { AccountLog } from "@buildingai/db/entities";
import { RechargeOrder } from "@buildingai/db/entities";
import { Recharge, RefundLog } from "@buildingai/db/entities";
import { PayModule } from "@common/modules/pay/pay.module";
import { RefundService } from "@common/modules/refund/services/refund.service";
import { PayModule as AppPayModule } from "@modules/pay/pay.module";
import { Module } from "@nestjs/common";

import { RechargeConfigController } from "./controllers/console/recharge-config.controller";
import { RechargeOrderController } from "./controllers/console/recharge-order.controller";
import { RechargeWebController } from "./controllers/web/recharge.controller";
import { RechargeService } from "./services/recharge.service";
import { RechargeConfigService } from "./services/recharge-config.service";
import { RechargeOrderService } from "./services/recharge-order.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Dict,
            Recharge,
            RechargeOrder,
            Payconfig,
            User,
            RefundLog,
            AccountLog,
        ]),
        PayModule,
        AppPayModule,
    ],
    controllers: [RechargeConfigController, RechargeOrderController, RechargeWebController],
    providers: [RechargeConfigService, RechargeOrderService, RefundService, RechargeService],
    exports: [RechargeConfigService, RechargeOrderService, RefundService, RechargeService],
})
export class RechargeModule {}
