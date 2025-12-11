import {
    type StorageConfigData,
    StorageType,
    type StorageTypeType,
} from "@buildingai/constants/shared/storage-config.constant";

import { AppEntity } from "../decorators/app-entity.decorator";
import { Column } from "../typeorm";
import { BaseEntity } from "./base";

@AppEntity({ name: "storage_config", comment: "存储配置" })
export class StorageConfig extends BaseEntity {
    @Column({ type: "enum", enum: StorageType, comment: "存储类型" })
    storageType: StorageTypeType;

    @Column({ type: "boolean", default: false, comment: "是否激活" })
    isActive: boolean;

    @Column({ default: 0, comment: "排序" })
    sort: number;

    @Column({ type: "jsonb", nullable: true, comment: "存储配置内容" })
    config: StorageConfigData;
}
