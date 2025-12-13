import { BaseController } from "@buildingai/base";
import { AliyunOssConfig, StorageType } from "@buildingai/constants/shared/storage-config.constant";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { ConsoleController } from "@common/decorators";
import { UpdateStorageConfigDto } from "@modules/system/dto/update-storage-config.dto";
import { Body, Get, Inject, Param, Patch } from "@nestjs/common";

import { StorageService } from "../../services/storage.service";

@ConsoleController(
    {
        path: "system-storage-config",
        skipAuth: true,
        skipPermissionCheck: true,
    },
    "存储配置",
)
export class StorageController extends BaseController {
    @Inject(StorageService)
    private storageService: StorageService;

    @Get()
    storageConfigList() {
        return this.storageService.getAllConfigs();
    }

    @Patch(":id")
    async updateStorageConfig(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() body: UpdateStorageConfigDto,
    ) {
        await this.storageService.updateConfig(id, body);
    }

    @Get("upload-signature")
    async getOSSUploadSignature() {
        const storage = await this.storageService.getActiveStorageConfig();
        switch (storage.storageType) {
            case StorageType.ALIYUN_OSS: {
                const config = storage.config as AliyunOssConfig;
                const signature = await this.storageService.getAliyunOssUploadSignature(config);
                return {
                    signature,
                    storageType: StorageType.ALIYUN_OSS,
                };
            }
            case StorageType.LOCAL: {
                return {
                    storageType: StorageType.LOCAL,
                };
            }
        }

        return null;
    }
}
