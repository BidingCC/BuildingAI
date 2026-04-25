import { CacheModule } from "@buildingai/cache";
import { Module } from "@nestjs/common";

import { CloudStorageService } from "./services/cloud-storage.service";
import { CosStorageService } from "./services/cos-storage.service";
import { OssStorageService } from "./services/oss-storage.service";

@Module({
    imports: [CacheModule],
    providers: [CloudStorageService, OssStorageService, CosStorageService],
    exports: [CloudStorageService],
})
export class CloudStorageModule {}
