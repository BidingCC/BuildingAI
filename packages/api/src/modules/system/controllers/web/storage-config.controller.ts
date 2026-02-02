import { BaseController } from "@buildingai/base";
import { HttpErrorFactory } from "@buildingai/errors";
import { WebController } from "@common/decorators/controller.decorator";
import { Get, Inject } from "@nestjs/common";

import { StorageConfigService } from "../../services/storage-config.service";

@WebController("storage-config")
export class StorageConfigWebController extends BaseController {
    @Inject(StorageConfigService)
    private storageService: StorageConfigService;

    constructor() {
        super();
    }

    @Get("active")
    async getActiveStorage() {
        const storage = await this.storageService.getActiveStorageConfig();
        if (!storage) {
            throw HttpErrorFactory.notFound("Storage config is not found");
        }

        return {
            id: storage.id,
            storageType: storage.storageType,
            isActive: storage.isActive,
        };
    }
}
