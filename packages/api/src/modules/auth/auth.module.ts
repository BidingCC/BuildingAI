import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import {
    Extension,
    ExtensionFeature,
    MembershipLevels,
    Permission,
    Role,
    User,
    UserSubscription,
    UserToken,
} from "@buildingai/db/entities";
import { AuthService } from "@common/modules/auth/services/auth.service";
import { ExtensionFeatureService } from "@common/modules/auth/services/extension-feature.service";
import { ExtensionFeatureScanService } from "@common/modules/auth/services/extension-feature-scan.service";
import { RolePermissionService } from "@common/modules/auth/services/role-permission.service";
import { UserTokenService } from "@common/modules/auth/services/user-token.service";
import { WechatModule } from "@common/modules/wechat/wechat.module";
import { ChannelModule } from "@modules/channel/channel.module";
import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
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
        TypeOrmModule.forFeature([
            User,
            Role,
            Permission,
            UserToken,
            Extension,
            ExtensionFeature,
            MembershipLevels,
            UserSubscription,
        ]),
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
    providers: [
        AuthService,
        ExtensionFeatureScanService,
        ExtensionFeatureService,
        RolePermissionService,
        UserTokenService,
        WechatOaService,
    ],
    exports: [
        AuthService,
        ExtensionFeatureScanService,
        ExtensionFeatureService,
        JwtModule,
        RolePermissionService,
        UserTokenService,
    ],
})
export class AuthModule {}
