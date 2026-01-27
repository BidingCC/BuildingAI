import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Dict } from "@buildingai/db/entities";
import { AuthModule } from "@modules/auth/auth.module";
import { ChannelModule } from "@modules/channel/channel.module";
import { WxOaConfigService } from "@modules/channel/services/wxoaconfig.service";
import { forwardRef, Module } from "@nestjs/common";

import { WechatMpClientFactory } from "./services/mpfactory.service";
import { WechatMpService } from "./services/wechatmp.service";
import { WechatOaService } from "./services/wechatoa.service";

@Module({
    imports: [ChannelModule, TypeOrmModule.forFeature([Dict]), forwardRef(() => AuthModule)],
    providers: [WechatOaService, WechatMpService, WechatMpClientFactory, WxOaConfigService],
    exports: [WechatOaService, WechatMpService, WechatMpClientFactory],
})
export class WechatModule {}
