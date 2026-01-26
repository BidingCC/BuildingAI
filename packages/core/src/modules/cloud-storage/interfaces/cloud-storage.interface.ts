import { StorageConfig } from "@buildingai/db/entities";

export interface CloudStorageParams {
    storageConfig: StorageConfig;
    file: Express.Multer.File;
    path: string;
    description?: string;
}
