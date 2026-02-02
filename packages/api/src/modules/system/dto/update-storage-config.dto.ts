import {
    StorageType,
    type StorageTypeType,
} from "@buildingai/constants/shared/storage-config.constant";
import { plainToInstance } from "class-transformer";
import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsString,
    IsUrl,
    Validate,
    validateSync,
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ name: "IsValidStorageConfig", async: false })
class IsValidStorageConfigConstraint implements ValidatorConstraintInterface {
    validate(config: any, args: ValidationArguments) {
        const object = args.object as any;
        const storageType = object.storageType;

        // Not need
        if (storageType === StorageType.LOCAL) {
            return config === null || config === undefined;
        }

        // In other cases, config is required
        if (!config) {
            return false;
        }

        let DtoClass: any;
        switch (storageType) {
            case StorageType.OSS:
                DtoClass = AliyunOssConfigDto;
                break;
            case StorageType.COS:
                DtoClass = TencentCosConfigDto;
                break;
            case StorageType.KODO:
                DtoClass = QiniuKodoConfigDto;
                break;
            default:
                return false;
        }

        // validate
        const configInstance = plainToInstance(DtoClass, config);
        const errors = validateSync(configInstance);

        return errors.length === 0;
    }

    defaultMessage(args: ValidationArguments) {
        const object = args.object as any;
        const storageType = object.storageType;
        const config = args.value;

        if (storageType === StorageType.LOCAL) {
            if (config !== null && config !== undefined) {
                return "Config must be null for LOCAL storage type";
            }
        }

        // Detail error
        let DtoClass: any;
        switch (storageType) {
            case StorageType.OSS:
                DtoClass = AliyunOssConfigDto;
                break;
            case StorageType.COS:
                DtoClass = TencentCosConfigDto;
                break;
            case StorageType.KODO:
                DtoClass = QiniuKodoConfigDto;
                break;
            default:
                return "Invalid storage type";
        }

        const configInstance = plainToInstance(DtoClass, config);
        const errors = validateSync(configInstance);

        if (errors.length > 0) {
            const errorMessages = errors
                .map((error) => Object.values(error.constraints || {}).join(", "))
                .join("; ");
            return `Config validation failed: ${errorMessages}`;
        }

        return "Invalid storage config";
    }
}

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
    @IsUrl({ protocols: ["https"], require_protocol: true })
    domain: string;
}

export class AliyunOssConfigDto extends BaseCloudConfigDto {
    @IsNotEmpty()
    @IsString()
    arn: string;
}

export class TencentCosConfigDto extends BaseCloudConfigDto {}

export class QiniuKodoConfigDto extends BaseCloudConfigDto {}

export class UpdateStorageConfigDto {
    @IsBoolean()
    isActive: boolean;

    @IsEnum(StorageType)
    storageType: StorageTypeType;

    @Validate(IsValidStorageConfigConstraint)
    config: TencentCosConfigDto | AliyunOssConfigDto | QiniuKodoConfigDto;
}
