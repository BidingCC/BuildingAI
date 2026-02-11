import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Dict } from "@buildingai/db/entities";
import { DictCacheService } from "@buildingai/dict";
import { DictService } from "@buildingai/dict";
import { GoogleOaConsoleController } from "@modules/channel/controller/console/google-oa.controller";
import { WxOaConfigConsoleController } from "@modules/channel/controller/console/wxoaconfig.controller";
import { GoogleOaConfigService } from "@modules/channel/services/google-oa.service";
import { WxOaConfigService } from "@modules/channel/services/wxoaconfig.service";
import { Module } from "@nestjs/common";

@Module({
    imports: [TypeOrmModule.forFeature([Dict])],
    controllers: [WxOaConfigConsoleController, GoogleOaConsoleController],
    providers: [WxOaConfigService, GoogleOaConfigService, DictService, DictCacheService],
    exports: [WxOaConfigService, GoogleOaConfigService],
})
export class ChannelModule {}
