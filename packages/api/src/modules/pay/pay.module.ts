import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Payconfig } from "@buildingai/db/entities";
import { Dict } from "@buildingai/db/entities";
import { AccountLog } from "@buildingai/db/entities";
import { RechargeOrder } from "@buildingai/db/entities";
import { Recharge } from "@buildingai/db/entities";
import { MembershipOrder } from "@buildingai/db/entities";
import { UserSubscription } from "@buildingai/db/entities";
import { PayModule as CommonPayModule } from "@common/modules/pay/pay.module";
import { WxPayService } from "@common/modules/pay/services/wxpay.service";
import { PayconfigService } from "@modules/system/services/payconfig.service";
import { Module } from "@nestjs/common";

import { PayWebController } from "./controllers/web/pay.controller";
import { PayService } from "./services/pay.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Dict,
            RechargeOrder,
            Recharge,
            User,
            Payconfig,
            AccountLog,
            MembershipOrder,
            UserSubscription,
        ]),
        CommonPayModule,
    ],
    controllers: [PayWebController],
    providers: [PayService, PayconfigService, WxPayService],
    exports: [PayService, PayconfigService, WxPayService],
})
export class PayModule {}
