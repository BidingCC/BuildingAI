import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Permission } from "@buildingai/db/entities";
import { PermissionConsoleController } from "@modules/permission/controllers/console/permission.controller";
import { PermissionService } from "@modules/permission/services/permission.service";
import { Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";

/**
 * 权限管理模块
 *
 * 提供权限的管理功能，包括权限扫描、权限列表查询等
 */
@Module({
    imports: [TypeOrmModule.forFeature([Permission]), DiscoveryModule],
    controllers: [PermissionConsoleController],
    providers: [PermissionService],
    exports: [PermissionService],
})
export class PermissionModule {}
