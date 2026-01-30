import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { DatasetMember, Datasets } from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { ConfigModule } from "@modules/config/config.module";

import { DatasetsWebController } from "./controllers/web/datasets.controller";
import { DatasetMemberService } from "./services/datasets-member.service";
import { DatasetsService } from "./services/datasets.service";

/**
 * 知识库模块（向量化数据集）
 *
 * Web 端知识库接口，不依赖 datasets-old。
 * 知识库公共配置（初始空间、向量模型、检索设置）由 Config 模块的 DatasetsConfigService 提供。
 */
@Module({
    imports: [TypeOrmModule.forFeature([Datasets, DatasetMember]), ConfigModule],
    controllers: [DatasetsWebController],
    providers: [DatasetsService, DatasetMemberService],
    exports: [DatasetsService, DatasetMemberService],
})
export class AiDatasetsModule {}
