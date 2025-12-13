import { AliyunOssConfig } from "@buildingai/constants/shared/storage-config.constant";
import { StorageConfig } from "@buildingai/db/entities";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { STS } from "ali-oss";
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
            .orderBy("sort", "ASC")
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

    getActiveStorageConfig() {
        return this.repository.findOne({ where: { isActive: true } });
    }

    async getAliyunOssUploadSignature(config: AliyunOssConfig) {
        const sts = new STS({ accessKeyId: config.accessKey, accessKeySecret: config.secretKey });
        const result = await sts.assumeRole(config.arn, null, 3600, "test-session");

        return {
            accessKeyId: result.credentials.AccessKeyId,
            accessKeySecret: result.credentials.AccessKeySecret,
            stsToken: result.credentials.SecurityToken,
            bucket: config.bucket,
        };
    }
}
