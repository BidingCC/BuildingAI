import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Permission } from "@buildingai/db/entities/permission.entity";
import { Role } from "@buildingai/db/entities/role.entity";
import { User } from "@buildingai/db/entities/user.entity";
import { UserToken } from "@buildingai/db/entities/user-token.entity";
import { AuthService } from "@common/modules/auth/services/auth.service";
import { RolePermissionService } from "@common/modules/auth/services/role-permission.service";
import { UserTokenService } from "@common/modules/auth/services/user-token.service";
import { WechatModule } from "@common/modules/wechat/wechat.module";
import { ChannelModule } from "@modules/channel/channel.module";
import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import type { StringValue } from "ms";

import { AuthWebController } from "./controller/web/auth.controller";

/**
 * 认证模块
 *
 * 处理用户认证、授权相关功能
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([User, Role, Permission, UserToken]),
        ChannelModule,
        forwardRef(() => WechatModule),
        DiscoveryModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: () => ({
                secret: process.env.JWT_SECRET || "BuildingAI",
                signOptions: {
                    expiresIn: (process.env.JWT_EXPIRES_IN as StringValue) || "24h",
                },
            }),
        }),
    ],
    controllers: [AuthWebController],
    providers: [AuthService, RolePermissionService, UserTokenService],
    exports: [AuthService, JwtModule, RolePermissionService, UserTokenService],
})
export class AuthModule {}
