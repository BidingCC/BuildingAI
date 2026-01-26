import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { File } from "@buildingai/db/entities";
import { StorageConfig } from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { CloudStorageModule } from "../cloud-storage";
import { FileStorageService } from "./services/file-storage.service";
import { FileUploadService } from "./services/file-upload.service";

/**
 * File upload module
 *
 * Provides core file upload and storage functionality
 * Can be used by both API and extensions
 */
@Module({
    imports: [TypeOrmModule.forFeature([File, StorageConfig]), CloudStorageModule],
    providers: [FileStorageService, FileUploadService],
    exports: [FileStorageService, FileUploadService],
})
export class UploadModule {}
