import { UploadModule } from "@buildingai/core/modules";
import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { File } from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { ChatImageService } from "./chat-image.service";

@Module({
    imports: [UploadModule, TypeOrmModule.forFeature([File])],
    providers: [ChatImageService],
    exports: [ChatImageService],
})
export class ChatImageModule {}
