import {
    BooleanNumber,
    type BooleanNumberType,
} from "@buildingai/constants/shared/status-codes.constant";
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
    @Column({ comment: "存储方式名称" })
    name: string;

    @Column({ type: "enum", enum: StorageType, comment: "存储类型" })
    storageType: StorageTypeType;

    @Column({ type: "enum", enum: BooleanNumber, default: BooleanNumber.NO, comment: "是否激活" })
    isActive: BooleanNumberType;

    @Column({ type: "jsonb", nullable: true, comment: "存储配置内容" })
    config: StorageConfigData;
}
