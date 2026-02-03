import { CacheModule } from "@buildingai/cache";
import { Module } from "@nestjs/common";

import { CloudStorageService } from "./services/cloud-storage.service";
import { OssStorageService } from "./services/oss-storage.service";

@Module({
    imports: [CacheModule],
    providers: [CloudStorageService, OssStorageService],
    exports: [CloudStorageService],
})
export class CloudStorageModule {}
