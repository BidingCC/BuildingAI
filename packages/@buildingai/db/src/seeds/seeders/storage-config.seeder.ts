import { StorageType } from "@buildingai/constants/shared/storage-config.constant";

import { StorageConfig } from "../../entities";
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
                    storageType: StorageType.LOCAL,
                    isActive: true,
                    config: null,
                    sort: 0,
                },
                {
                    storageType: StorageType.OSS,
                    isActive: false,
                    config: null,
                    sort: 1,
                },
                // {
                //     storageType: StorageType.COS,
                //     isActive: false,
                //     config: null,
                //     sort: 2,
                // },
                // {
                //     storageType: StorageType.KODO,
                //     isActive: false,
                //     config: null,
                //     sort: 3,
                // },
            ]);

            this.logSuccess("Storage configuration initialized successfully");
        } catch (error) {
            this.logError(`Storage configuration initialization failed: ${error.message}`);
            throw error;
        }
    }
}
