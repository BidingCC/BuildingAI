import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Dict } from "@buildingai/db/entities/dict.entity";
import { WxMpVersion } from "@buildingai/db/entities/wx-mp-version.entity";
import { DictCacheService } from "@buildingai/dict";
import { DictService } from "@buildingai/dict";
import { WxMpVersionConsoleController } from "@modules/channel/controller/console/wxmp-version.controller";
import { WxMpConfigConsoleController } from "@modules/channel/controller/console/wxmpconfig.controller";
import { WxOaConfigConsoleController } from "@modules/channel/controller/console/wxoaconfig.controller";
import { WxMpVersionService } from "@modules/channel/services/wxmp-version.service";
import { WxMpConfigService } from "@modules/channel/services/wxmpconfig.service";
import { WxOaConfigService } from "@modules/channel/services/wxoaconfig.service";
import { Module } from "@nestjs/common";
@Module({
    imports: [TypeOrmModule.forFeature([Dict, WxMpVersion])],
    controllers: [
        WxOaConfigConsoleController,
        WxMpConfigConsoleController,
        WxMpVersionConsoleController,
    ],
    providers: [
        WxOaConfigService,
        DictService,
        DictCacheService,
        WxMpConfigService,
        WxMpVersionService,
    ],
    exports: [WxOaConfigService, WxMpConfigService, WxMpVersionService],
})
export class ChannelModule {}
