import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Agent } from "@buildingai/db/entities";
import {
    AccountLog,
    File,
    MembershipLevels,
    MembershipOrder,
    UserSubscription,
} from "@buildingai/db/entities";
import { Permission } from "@buildingai/db/entities";
import { Role } from "@buildingai/db/entities";
import { Department } from "@buildingai/db/entities";
import { DepartmentUserIndex } from "@buildingai/db/entities";
import { SmsModule } from "@common/modules/sms/sms.module";
import { AiDatasetsModule } from "@modules/ai/datasets/datasets.module";
import { AuthModule } from "@modules/auth/auth.module";
import { forwardRef, Module } from "@nestjs/common";

import { MembershipModule } from "../membership/membership.module";
import { MenuModule } from "../menu/menu.module";
import { RoleModule } from "../role/role.module";
import { UserConsoleController } from "./controllers/console/user.controller";
import { UserWebController } from "./controllers/web/user.controller";
import { UserService } from "./services/user.service";
import { UserCapacityService } from "./services/user-capacity.service";

/**
 * 用户管理模块
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            User,
            Role,
            Permission,
            AccountLog,
            Agent,
            UserSubscription,
            MembershipOrder,
            MembershipLevels,
            File,
            Department,
            DepartmentUserIndex,
        ]),
        forwardRef(() => AuthModule),
        SmsModule,
        MenuModule,
        RoleModule,
        forwardRef(() => AiDatasetsModule),
        MembershipModule,
    ],
    controllers: [UserConsoleController, UserWebController],
    providers: [UserService, UserCapacityService],
    exports: [UserService, UserCapacityService],
})
export class UserModule {}
