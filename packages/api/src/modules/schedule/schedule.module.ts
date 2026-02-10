import { ScheduleService } from "@buildingai/core";
import { ScheduleModule as NestScheduleModule } from "@buildingai/core/@nestjs/schedule";
import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { AccountLog, User, UserSubscription } from "@buildingai/db/entities";
import { MembershipModule } from "@modules/membership/membership.module";
import { PayModule } from "@modules/pay/pay.module";
import { RechargeModule } from "@modules/recharge/recharge.module";
import { Module } from "@nestjs/common";

import { ScheduleController } from "./controllers/schedule.controller";
import { MembershipGiftService } from "./services/membership-gift.service";
import { OrderScheduleService } from "./services/order-schedule.service";
import { RefundScheduleService } from "./services/refund-schedule.service";

/**
 * 定时任务模块
 *
 * 基于 NestJS 内置的 ScheduleModule 实现的简单定时任务模块
 */
@Module({
    imports: [
        NestScheduleModule.forRoot(),
        TypeOrmModule.forFeature([User, UserSubscription, AccountLog]),
        MembershipModule,
        PayModule,
        RechargeModule,
    ],
    controllers: [ScheduleController],
    providers: [
        ScheduleService,
        MembershipGiftService,
        OrderScheduleService,
        RefundScheduleService,
    ],
    exports: [ScheduleService],
})
export class ScheduleModule {}
