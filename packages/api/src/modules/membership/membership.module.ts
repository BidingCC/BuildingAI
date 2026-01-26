import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import {
    MembershipLevels,
    MembershipOrder,
    MembershipPlans,
    Payconfig,
    RefundLog,
    User,
    UserSubscription,
} from "@buildingai/db/entities";
import { DictModule } from "@buildingai/dict";
import { PayModule } from "@common/modules/pay/pay.module";
import { RefundService } from "@common/modules/refund/services/refund.service";
import { Module } from "@nestjs/common";

import { LevelsConsoleController } from "./controllers/console/levels.controller";
import { MembershipOrderController } from "./controllers/console/order.controller";
import { PlansConsoleController } from "./controllers/console/plans.controller";
import { MembershipWebController } from "./controllers/web/membership.controller";
import { LevelsService } from "./services/levels.service";
import { MembershipOrderService } from "./services/order.service";
import { PlansService } from "./services/plans.service";

/**
 * 会员模块
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            MembershipLevels,
            MembershipPlans,
            MembershipOrder,
            Payconfig,
            RefundLog,
            UserSubscription,
            User,
        ]),
        DictModule,
        PayModule,
    ],
    controllers: [
        LevelsConsoleController,
        PlansConsoleController,
        MembershipOrderController,
        MembershipWebController,
    ],
    providers: [LevelsService, PlansService, MembershipOrderService, RefundService],
    exports: [LevelsService, PlansService, MembershipOrderService, RefundService],
})
export class MembershipModule {}
