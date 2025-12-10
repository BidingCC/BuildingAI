import { BaseController } from "@buildingai/base";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { ConsoleController } from "@common/decorators";
import { UpdateStorageConfigDto } from "@modules/system/dto/update-storage-config.dto";
import { Body, Get, Inject, Param, Put } from "@nestjs/common";

import { StorageService } from "../../services/storage.service";

@ConsoleController(
    {
        path: "system-storage-config",
        skipAuth: true,
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

    @Put(":id")
    async updateStorageConfig(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: UpdateStorageConfigDto,
    ) {
        await this.storageService.updateConfig(id, dto);
    }
}
