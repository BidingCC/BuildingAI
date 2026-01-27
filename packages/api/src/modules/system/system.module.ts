import { CacheService } from "@buildingai/cache";
import { CloudStorageModule } from "@buildingai/core";
import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Payconfig } from "@buildingai/db/entities";
import { Dict } from "@buildingai/db/entities";
import { AccountLog, MembershipLevels, UserSubscription } from "@buildingai/db/entities";
import { Permission } from "@buildingai/db/entities";
import { Role } from "@buildingai/db/entities";
import { UserToken } from "@buildingai/db/entities";
import { StorageConfig } from "@buildingai/db/entities";
import { RolePermissionService } from "@common/modules/auth/services/role-permission.service";
import { PayModule } from "@common/modules/pay/pay.module";
import { AuthModule } from "@modules/auth/auth.module";
import { UserService } from "@modules/user/services/user.service";
import { forwardRef, Module } from "@nestjs/common";

import { PayconfigConsoleController } from "./controllers/console/payconfig.controller";
import { StorageConfigController } from "./controllers/console/storage-config.controller";
import { SystemConsoleController } from "./controllers/console/system.controller";
import { WebsiteConsoleController } from "./controllers/console/website.controller";
import { StorageConfigWebController } from "./controllers/web/storage-config.controller";
import { PayconfigService } from "./services/payconfig.service";
import { StorageConfigService } from "./services/storage-config.service";
import { SystemService } from "./services/system.service";
import { WebsiteService } from "./services/website.service";

/**
 * 系统模块
 */
@Module({
    imports: [
        forwardRef(() => AuthModule),
        CloudStorageModule,
        TypeOrmModule.forFeature([
            Dict,
            Permission,
            UserToken,
            User,
            AccountLog,
            Role,
            Payconfig,
            UserSubscription,
            MembershipLevels,
            StorageConfig,
        ]),
        forwardRef(() => PayModule),
    ],
    controllers: [
        WebsiteConsoleController,
        SystemConsoleController,
        PayconfigConsoleController,
        StorageConfigController,
        StorageConfigWebController,
    ],
    providers: [
        WebsiteService,
        RolePermissionService,
        SystemService,
        CacheService,
        PayconfigService,
        UserService,
        StorageConfigService,
    ],
    exports: [WebsiteService, SystemService, PayconfigService, StorageConfigService],
})
export class SystemModule {}
