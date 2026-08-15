import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Dict } from "@buildingai/db/entities";
import { DictCacheService } from "@buildingai/dict";
import { DictService } from "@buildingai/dict";
import { GoogleConfigConsoleController } from "@modules/channel/controller/console/google-config.controller";
import { GoogleConfigService } from "@modules/channel/services/google-config.service";
import { WxOaConfigConsoleController } from "@modules/channel/controller/console/wxoaconfig.controller";
import { WxOaConfigService } from "@modules/channel/services/wxoaconfig.service";
import { Module } from "@nestjs/common";

@Module({
    imports: [TypeOrmModule.forFeature([Dict])],
    controllers: [WxOaConfigConsoleController, GoogleConfigConsoleController],
    providers: [WxOaConfigService, GoogleConfigService, DictService, DictCacheService],
    exports: [WxOaConfigService, GoogleConfigService],
})
export class ChannelModule {}
