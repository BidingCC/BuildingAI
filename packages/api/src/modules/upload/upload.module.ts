import { RedisModule } from "@buildingai/cache";
import { CloudStorageModule, UploadModule as CoreUploadModule } from "@buildingai/core";
import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { File } from "@buildingai/db/entities";
import { SystemModule } from "@modules/system/system.module";
import { forwardRef, Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { UploadController } from "./controllers/web/upload.controller";
import { UploadService } from "./services/upload.service";

/**
 * 文件上传模块
 *
 * 提供文件上传、存储和管理功能
 */
@Module({
    imports: [
        forwardRef(() => SystemModule),
        CoreUploadModule,
        CloudStorageModule,
        TypeOrmModule.forFeature([File]),
        MulterModule.register({
            storage: memoryStorage(),
        }),
        RedisModule,
    ],
    controllers: [UploadController],
    providers: [UploadService],
    exports: [UploadService],
})
export class UploadModule {}
