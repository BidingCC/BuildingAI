import { StorageConfig } from "@buildingai/db/entities";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import { UpdateStorageConfigDto } from "../dto/update-storage-config.dto";

@Injectable()
export class StorageService {
    @InjectRepository(StorageConfig)
    private repository: Repository<StorageConfig>;

    constructor(private dataSource: DataSource) {}

    async getAllConfigs() {
        return await this.repository
            .createQueryBuilder("storage-config")
            .select([
                "storage-config.id",
                "storage-config.isActive",
                "storage-config.storageType",
                "storage-config.config",
            ])
            .getMany();
    }

    async updateConfig(id: string, dto: UpdateStorageConfigDto) {
        await this.dataSource.manager.transaction(async (manager) => {
            const activeStorage = await manager.findOne(StorageConfig, {
                where: { isActive: true },
            });

            // Deactivate the currently active storage
            if (activeStorage.id !== id && dto.isActive) {
                activeStorage.isActive = false;
                await manager.save(activeStorage);
            }

            const { storageType, ...updateValue } = dto;
            await manager.update(StorageConfig, { id, storageType }, updateValue);
        });
    }
}
