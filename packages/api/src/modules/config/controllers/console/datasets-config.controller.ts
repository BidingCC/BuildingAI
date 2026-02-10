import { BaseController } from "@buildingai/base";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Get, Post } from "@nestjs/common";

import { UpdateDatasetsConfigDto } from "../../dto/datasets-config.dto";
import { DatasetsConfigDto, DatasetsConfigService } from "../../services/datasets-config.service";

@ConsoleController("datasets-config", "知识库配置")
export class DatasetsConfigConsoleController extends BaseController {
    constructor(private readonly datasetsConfigService: DatasetsConfigService) {
        super();
    }

    @Get()
    @Permissions({ code: "get", name: "获取知识库配置", description: "获取知识库配置" })
    async get() {
        return await this.datasetsConfigService.getConfig();
    }

    @Post()
    @Permissions({ code: "set", name: "设置知识库配置", description: "设置知识库配置" })
    async set(@Body() dto: UpdateDatasetsConfigDto) {
        return await this.datasetsConfigService.setConfig(dto as Partial<DatasetsConfigDto>);
    }
}
