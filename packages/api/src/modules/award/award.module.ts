import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import {
    AccountLog,
    Dict,
    MembershipLevels,
    SignRecord,
    User,
    UserSubscription,
} from "@buildingai/db/entities";
import { UserAwardService } from "@common/modules/auth/services/user-award.service";
import { Module } from "@nestjs/common";

import { AwardController } from "./controllers/console/award.controller";
import { AwardRecordController } from "./controllers/console/award-record.controller";
import { TaskAwardController } from "./controllers/web/task-award.controller";
import { AwardService } from "./services/award.service";
import { AwardRecordService } from "./services/award-record.service";
import { TaskAwardService } from "./services/task-award.service";
/**
 * 奖励模块
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            Dict,
            SignRecord,
            MembershipLevels,
            User,
            AccountLog,
            UserSubscription,
        ]),
    ],
    controllers: [AwardController, AwardRecordController, TaskAwardController],
    providers: [AwardService, AwardRecordService, TaskAwardService, UserAwardService],
    exports: [AwardService, AwardRecordService, TaskAwardService, UserAwardService],
})
export class AwardModule {}
