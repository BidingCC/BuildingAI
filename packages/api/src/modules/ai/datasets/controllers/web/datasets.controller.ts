import { type UserPlayground } from "@buildingai/db";
import { Datasets } from "@buildingai/db/entities";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import { Body, Post } from "@nestjs/common";

import { CreateEmptyDatasetDto } from "../../dto/create-empty-dataset.dto";
import { DatasetsService } from "../../services/datasets.service";

/**
 * 知识库 Web 控制器
 *
 * 提供前台用户创建、管理知识库的接口
 */
@WebController("ai-datasets")
export class DatasetsWebController {
    constructor(private readonly datasetsService: DatasetsService) {}

    /**
     * 创建知识库
     *
     * 创建一个空知识库，包含名称、描述。向量模型与检索设置从后台「知识库配置」字典读取。
     * 创建后可再上传文档并进行向量化。
     *
     * @param dto - 知识库创建参数（name、description）
     * @param user - 当前用户信息
     * @returns 创建的知识库信息
     */
    @Post("create-empty")
    async createEmpty(
        @Body() dto: CreateEmptyDatasetDto,
        @Playground() user: UserPlayground,
    ): Promise<Datasets> {
        return this.datasetsService.createEmptyDataset(dto, user);
    }
}
