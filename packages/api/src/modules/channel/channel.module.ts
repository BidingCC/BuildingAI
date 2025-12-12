import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Dict } from "@buildingai/db/entities/dict.entity";
import { DictCacheService } from "@buildingai/dict";
import { DictService } from "@buildingai/dict";
import { WxMpConfigConsoleController } from "@modules/channel/controller/console/wxmpconfig.controller";
import { WxOaConfigConsoleController } from "@modules/channel/controller/console/wxoaconfig.controller";
import { WxMpConfigService } from "@modules/channel/services/wxmpconfig.service";
import { WxOaConfigService } from "@modules/channel/services/wxoaconfig.service";
import { Module } from "@nestjs/common";
@Module({
    imports: [TypeOrmModule.forFeature([Dict])],
    controllers: [WxOaConfigConsoleController, WxMpConfigConsoleController],
    providers: [WxOaConfigService, DictService, DictCacheService, WxMpConfigService],
    exports: [WxOaConfigService, WxMpConfigService],
})
export class ChannelModule {}
