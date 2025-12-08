import { BooleanNumber, type BooleanNumberType } from "@buildingai/constants";
import type { StorageConfigData } from "@buildingai/constants/shared/storage-config.constant";
import {
    IsEnum,
    IsFQDN,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";

class BaseCloudConfigDto {
    @IsNotEmpty()
    @IsString()
    bucket: string;

    @IsNotEmpty()
    @IsString()
    accessKey: string;

    @IsNotEmpty()
    @IsString()
    secretKey: string;

    @IsNotEmpty()
    @IsString()
    @IsFQDN({}, { message: "Domain is invalid" })
    domain: string;
}

export class AliyunOssConfigDto extends BaseCloudConfigDto {
    @IsOptional()
    @IsString()
    endpoint?: string;

    @IsOptional()
    @IsString()
    arn?: string;
}

export class UpdateStorageConfigDto {
    @IsOptional()
    @IsString()
    @MaxLength(64)
    name?: string;

    @IsOptional()
    @IsEnum(BooleanNumber)
    isActive?: BooleanNumberType;

    @IsOptional()
    @IsObject()
    config?: StorageConfigData;
}
