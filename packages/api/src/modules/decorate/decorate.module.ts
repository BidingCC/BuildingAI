import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { DecorateMicropageEntity, DecoratePageEntity } from "@buildingai/db/entities";
import { MicroPageConsoleController } from "@modules/decorate/controllers/console/micropage.controller";
import { PageConsoleController } from "@modules/decorate/controllers/console/page.controller";
import { PageWebController } from "@modules/decorate/controllers/web/page.controller";
import { MicropageService } from "@modules/decorate/services/micropage.service";
import { PageService } from "@modules/decorate/services/page.service";
import { PluginLinksService } from "@modules/decorate/services/plugin-links.service";
import { Module } from "@nestjs/common";

@Module({
    imports: [TypeOrmModule.forFeature([DecoratePageEntity, DecorateMicropageEntity])],
    controllers: [PageConsoleController, MicroPageConsoleController, PageWebController],
    providers: [PageService, MicropageService, PluginLinksService],
    exports: [PageService, MicropageService, PluginLinksService],
})
export class DecorateModule {}
