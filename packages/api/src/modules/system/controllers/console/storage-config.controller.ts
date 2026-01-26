import { BaseController } from "@buildingai/base";
import { HttpErrorFactory } from "@buildingai/errors";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { ConsoleController } from "@common/decorators";
import { UpdateStorageConfigDto } from "@modules/system/dto/update-storage-config.dto";
import { Body, Get, Inject, Param, Patch } from "@nestjs/common";

import { StorageConfigService } from "../../services/storage-config.service";

@ConsoleController("system-storage-config", "存储配置")
export class StorageConfigController extends BaseController {
    @Inject(StorageConfigService)
    private storageService: StorageConfigService;

    @Get()
    storageConfigList() {
        return this.storageService.getAllConfigs();
    }

    @Get(":id")
    async getDetail(@Param("id", UUIDValidationPipe) id: string) {
        const storageConfig = await this.storageService.getStorageDetail(id);
        if (!storageConfig) {
            throw HttpErrorFactory.notFound("Storage config is not found");
        }

        return storageConfig;
    }

    @Patch(":id")
    async updateStorageConfig(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() body: UpdateStorageConfigDto,
    ) {
        await this.storageService.updateConfig(id, body);
    }
}
