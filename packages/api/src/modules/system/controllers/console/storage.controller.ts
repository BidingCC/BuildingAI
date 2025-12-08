import { BaseController } from "@buildingai/base";
import { ConsoleController } from "@common/decorators";
import { Get, Inject } from "@nestjs/common";

import { StorageService } from "../../services/storage.service";

@ConsoleController("system-storage-config", "存储配置")
export class StorageController extends BaseController {
    @Inject(StorageService)
    private storageService: StorageService;

    @Get()
    storageConfigList() {
        return this.storageService.getAllConfigs();
    }
}
