import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Permission } from "@buildingai/db/entities";
import { Role } from "@buildingai/db/entities";
import { RolePermissionService } from "@common/modules/auth/services/role-permission.service";
import { Module } from "@nestjs/common";

import { RoleController } from "./controllers/console/role.controller";
import { RoleService } from "./services/role.service";

/**
 * 角色管理模块
 *
 * 提供角色的增删改查等管理功能
 */
@Module({
    imports: [TypeOrmModule.forFeature([Role, Permission, User])],
    controllers: [RoleController],
    providers: [RoleService, RolePermissionService],
    exports: [RoleService, RolePermissionService],
})
export class RoleModule {}
