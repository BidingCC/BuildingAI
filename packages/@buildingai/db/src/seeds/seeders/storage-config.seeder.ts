import { BooleanNumber } from "@buildingai/constants";
import { StorageType } from "@buildingai/constants/shared/storage-config.constant";

import { StorageConfig } from "../../entities/storage-config.entity";
import { DataSource } from "../../typeorm";
import { BaseSeeder } from "./base.seeder";

export class StorageConfigSeeder extends BaseSeeder {
    readonly name = "StorageConfigSeeder";
    readonly priority = 80;

    async run(dataSource: DataSource) {
        const repository = dataSource.getRepository(StorageConfig);

        try {
            const existingCount = await repository.count();
            // skip
            if (existingCount > 0) {
                this.logInfo(
                    `Detected ${existingCount} storage configurations, skipping initialization`,
                );
                return;
            }

            await repository.save([
                {
                    name: "local",
                    storageType: StorageType.LOCAL,
                    isActive: BooleanNumber.YES,
                    config: null,
                },
                {
                    name: "aliyun-oss",
                    storageType: StorageType.ALIYUN_OSS,
                    isActive: BooleanNumber.NO,
                    config: null,
                },
                {
                    name: "tencent-cos",
                    storageType: StorageType.TENCENT_COS,
                    isActive: BooleanNumber.NO,
                    config: null,
                },
                {
                    name: "qiniu-kodo",
                    storageType: StorageType.QINIU_KODO,
                    isActive: BooleanNumber.NO,
                    config: null,
                },
            ]);

            this.logSuccess("Storage configuration initialized successfully");
        } catch (error) {
            this.logError(`Storage configuration initialization failed: ${error.message}`);
            throw error;
        }
    }
}
