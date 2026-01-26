import { BooleanNumber, type BooleanNumberType } from "@buildingai/constants";
import { KeyFieldValue } from "@buildingai/db/entities";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { PartialType } from "@nestjs/mapped-types";
import { Transform, Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    ValidateNested,
} from "class-validator";

/**
 * 密钥字段值DTO
 */
export class KeyFieldValueDto implements KeyFieldValue {
    /**
     * 字段名称
     */
    @IsString({ message: "字段名称必须是字符串" })
    @IsNotEmpty({ message: "字段名称不能为空" })
    @MaxLength(50, { message: "字段名称长度不能超过50个字符" })
    name: string;

    /**
     * 字段值
     */
    @IsOptional()
    @IsString({ message: "字段值必须是字符串" })
    value?: string;

    /**
     * 是否加密存储
     */
    @IsBoolean({ message: "是否加密存储必须是布尔值" })
    @IsOptional()
    encrypted?: boolean;
}

/**
 * 创建密钥配置DTO
 */
export class CreateSecretDto {
    /**
     * 密钥名称
     */
    @IsString({ message: "密钥名称必须是字符串" })
    @IsNotEmpty({ message: "密钥名称不能为空" })
    @MaxLength(100, { message: "密钥名称长度不能超过100个字符" })
    name: string;

    /**
     * 所属模板ID
     */
    @IsUUID("4", { message: "模板ID必须是有效的UUID" })
    @IsNotEmpty({ message: "模板ID不能为空" })
    templateId: string;

    /**
     * 密钥字段配置
     */
    @IsArray({ message: "密钥字段配置必须是数组" })
    @ValidateNested({ each: true })
    @Type(() => KeyFieldValueDto)
    fieldValues: KeyFieldValueDto[];

    /**
     * 备注信息
     */
    @IsString({ message: "备注信息必须是字符串" })
    @IsOptional()
    @MaxLength(1000, { message: "备注信息长度不能超过1000个字符" })
    remark?: string;

    /**
     * 配置状态
     */
    @IsNumber({}, { message: "配置状态必须是数字" })
    @IsOptional()
    status?: BooleanNumberType = BooleanNumber.YES;

    /*	*
     * 排序权重
     */
    @IsInt({ message: "排序权重必须是整数" })
    @IsOptional()
    sortOrder?: number = 0;
}

/**
 * 更新密钥配置DTO
 */
export class UpdateSecretDto extends PartialType(CreateSecretDto) {}

/**
 * 查询密钥配置DTO
 */
export class QuerySecretDto extends PaginationDto {
    /**
     * 密钥名称
     * 支持模糊查询
     */
    @IsString({ message: "密钥名称必须是字符串" })
    @IsOptional()
    name?: string;

    /**
     * 所属模板ID
     */
    @IsOptional()
    @Transform(({ value }) => {
        if (value === "all" || value === null || value === undefined) {
            return undefined;
        }
        return value;
    })
    @IsUUID("4", { message: "模板ID必须是有效的UUID" })
    templateId?: string;

    /**
     * 启用状态
     */
    @IsNumber({}, { message: "启用状态必须是数字" })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined || value === null) return value;

        return Number(value);
    })
    status?: BooleanNumberType;
}

/**
 * 密钥配置使用统计DTO
 */
export class SecretUsageDto {
    /**
     * 配置ID
     */
    @IsUUID("4", { message: "配置ID必须是有效的UUID" })
    @IsNotEmpty({ message: "配置ID不能为空" })
    configId: string;

    /**
     * 使用场景描述
     */
    @IsString({ message: "使用场景描述必须是字符串" })
    @IsOptional()
    @MaxLength(200, { message: "使用场景描述长度不能超过200个字符" })
    usage?: string;
}
