import { DictModule } from "@buildingai/dict";
import { DecorateConsoleController } from "@modules/decorate/controllers/console/decorate.controller";
import { DecorateWebController } from "@modules/decorate/controllers/web/decorate.controller";
import { PluginLinksService } from "@modules/decorate/services/plugin-links.service";
import { Module } from "@nestjs/common";

@Module({
    imports: [DictModule],
    controllers: [DecorateConsoleController, DecorateWebController],
    providers: [PluginLinksService],
    exports: [PluginLinksService],
})
export class DecorateModule {}
