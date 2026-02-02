import { AliyunOssConfig, BusinessCode, StorageType, StorageTypeType } from "@buildingai/constants";
import { StorageConfig } from "@buildingai/db/entities";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import type { CloudStorageParams } from "../interfaces/cloud-storage.interface";
import { OssStorageService } from "./oss-storage.service";

@Injectable()
export class CloudStorageService {
    constructor(private readonly ossStorageService: OssStorageService) {}

    async upload(params: CloudStorageParams) {
        switch (params.storageConfig.storageType) {
            case StorageType.OSS:
                return await this.ossStorageService.upload(params);
            default: {
                throw HttpErrorFactory.internal(
                    `Unavailable storage type: ${params.storageConfig.storageType}`,
                    BusinessCode.INVALID_REQUEST,
                );
            }
        }
    }

    async signature(storageConfig: StorageConfig) {
        switch (storageConfig.storageType) {
            case StorageType.OSS: {
                const config = storageConfig.config as AliyunOssConfig;
                return await this.ossStorageService.generateOssUploadSignature(config);
            }
            default: {
                throw HttpErrorFactory.internal(
                    `Unavailable storage type: ${storageConfig.storageType}`,
                    BusinessCode.INVALID_REQUEST,
                );
            }
        }
    }

    async clearCachedCredentials(type: StorageTypeType) {
        switch (type) {
            case StorageType.OSS:
                await this.ossStorageService.clearOssStsCredentials();
        }
    }
}
