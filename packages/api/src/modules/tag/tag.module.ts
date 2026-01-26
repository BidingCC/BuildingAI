import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Tag } from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { TagController } from "./controllers/console/tag.controller";
import { TagWebController } from "./controllers/web/tag.web.controller";
import { TagService } from "./services/tag.service";

@Module({
    imports: [TypeOrmModule.forFeature([Tag])],
    controllers: [TagController, TagWebController],
    providers: [TagService],
    exports: [TagService],
})
export class TagModule {}
