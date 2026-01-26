import { ScheduleService } from "@buildingai/core";
import { ScheduleModule as NestScheduleModule } from "@buildingai/core/@nestjs/schedule";
import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { AccountLog, User, UserSubscription } from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { ScheduleController } from "./controllers/schedule.controller";
import { MembershipGiftService } from "./services/membership-gift.service";

/**
 * 定时任务模块
 *
 * 基于 NestJS 内置的 ScheduleModule 实现的简单定时任务模块
 */
@Module({
    imports: [
        NestScheduleModule.forRoot(),
        TypeOrmModule.forFeature([User, UserSubscription, AccountLog]),
    ],
    controllers: [ScheduleController],
    providers: [ScheduleService, MembershipGiftService],
    exports: [ScheduleService],
})
export class ScheduleModule {}
