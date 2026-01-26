import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Agent } from "@buildingai/db/entities";
import {
    AccountLog,
    MembershipLevels,
    MembershipOrder,
    UserSubscription,
} from "@buildingai/db/entities";
import { Permission } from "@buildingai/db/entities";
import { Role } from "@buildingai/db/entities";
import { AiDatasetsModule } from "@modules/ai/datasets/datasets.module";
import { Module } from "@nestjs/common";

import { MembershipModule } from "../membership/membership.module";
import { MenuModule } from "../menu/menu.module";
import { RoleModule } from "../role/role.module";
import { UserConsoleController } from "./controllers/console/user.controller";
import { UserWebController } from "./controllers/web/user.controller";
import { UserService } from "./services/user.service";

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
        ]),
        MenuModule,
        RoleModule,
        AiDatasetsModule,
        MembershipModule,
    ],
    controllers: [UserConsoleController, UserWebController],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule {}
