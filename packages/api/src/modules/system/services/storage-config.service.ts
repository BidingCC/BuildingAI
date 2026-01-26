import { StorageType } from "@buildingai/constants/shared/storage-config.constant";
import { CloudStorageService } from "@buildingai/core";
import { Dict, StorageConfig } from "@buildingai/db/entities";
import { FileUrlProcessorUtil } from "@buildingai/utils";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import type { EntityManager } from "typeorm/entity-manager/EntityManager";

import { UpdateStorageConfigDto } from "../dto/update-storage-config.dto";

interface DictUpdateData {
    key: string;
    value: string;
    group: string;
    description?: string;
    isEnabled: boolean;
}

@Injectable()
export class StorageConfigService {
    @InjectRepository(StorageConfig)
    private readonly repository: Repository<StorageConfig>;

    constructor(
        private dataSource: DataSource,
        private readonly cloudStorageService: CloudStorageService,
    ) {}

    async getAllConfigs() {
        return await this.repository
            .createQueryBuilder("storage-config")
            .select(["storage-config.id", "storage-config.isActive", "storage-config.storageType"])
            .orderBy("sort", "ASC")
            .getMany();
    }

    async updateConfig(id: string, dto: UpdateStorageConfigDto) {
        await this.dataSource.manager.transaction(async (manager) => {
            if (dto.isActive) {
                await manager.update(StorageConfig, { isActive: true }, { isActive: false });
            }

            await manager.update(
                StorageConfig,
                { id },
                {
                    config: dto.config,
                    isActive: dto.isActive,
                },
            );

            const activeStorage = await manager.findOne(StorageConfig, {
                where: { isActive: true },
            });
            await this.cloudStorageService.clearCachedCredentials(activeStorage.storageType);
            await this.updateCurrentActiveConfigToDict(manager, activeStorage);

            FileUrlProcessorUtil.clearCache();
        });
    }

    getActiveStorageConfig() {
        return this.repository.findOne({
            where: {
                isActive: true,
            },
        });
    }

    getStorageDetail(id: string) {
        return this.repository.findOne({ where: { id } });
    }

    private async updateCurrentActiveConfigToDict(manager: EntityManager, storage: StorageConfig) {
        const group = "storage_config";

        await this.upsertDict(manager, {
            key: "engine",
            value: storage.storageType,
            group,
            description: "当前激活的存储引擎类型",
            isEnabled: true,
        });

        await this.upsertDict(manager, {
            group,
            key: "domain",
            description: "当前激活的存储域名",
            value: storage.config ? (storage.config as any).domain : "",
            isEnabled: storage.storageType !== StorageType.LOCAL,
        });
    }

    private async upsertDict(manager: EntityManager, data: DictUpdateData) {
        const existDict = await manager.findOne(Dict, {
            where: { key: data.key, group: data.group },
        });

        if (existDict) {
            await manager.update(
                Dict,
                { id: existDict.id },
                {
                    value: data.value,
                    description: data.description,
                    isEnabled: data.isEnabled,
                },
            );
        } else {
            const dict = manager.create(Dict, {
                ...data,
                sort: 0,
            });
            await manager.save(dict);
        }
    }
}
