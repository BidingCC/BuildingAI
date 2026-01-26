import { BooleanNumber, type BooleanNumberType } from "@buildingai/constants";
import { FieldType, TemplateField } from "@buildingai/db/entities";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { PartialType } from "@nestjs/mapped-types";
import { Transform, Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsDefined,
    IsEnum,
    IsInt,
    IsJSON,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from "class-validator";

/**
 * 模板字段配置DTO
 */
export class TemplateFieldDto implements TemplateField {
    /**
     * 字段名称
     */
    @IsString({ message: "字段名称必须是字符串" })
    @IsNotEmpty({ message: "字段名称不能为空" })
    @MaxLength(50, { message: "字段名称长度不能超过50个字符" })
    name: string;

    /**
     * 字段类型
     */
    @IsEnum(FieldType, { message: "字段类型必须是有效的枚举值" })
    type: FieldType;

    /**
     * 是否必填
     */
    @IsBoolean({ message: "是否必填必须是布尔值" })
    required: boolean;

    /**
     * 占位符
     */
    @IsString({ message: "占位符必须是字符串" })
    @IsOptional()
    @MaxLength(200, { message: "占位符长度不能超过200个字符" })
    placeholder?: string;
}

/**
 * 创建密钥模板DTO
 */
export class CreateSecretTemplateDto {
    /**
     * 模板名称
     */
    @IsDefined({ message: "模板名称不能为空" })
    @IsNotEmpty({ message: "模板名称不能为空" })
    @IsString({ message: "模板名称必须是字符串" })
    @MaxLength(100, { message: "模板名称长度不能超过100个字符" })
    name: string;

    /**
     * 模板图标
     */
    @IsString({ message: "模板图标必须是字符串" })
    @IsOptional()
    @MaxLength(200, { message: "模板图标长度不能超过200个字符" })
    icon?: string;

    /**
     * 字段配置
     */
    @IsArray({ message: "字段配置必须是数组" })
    @ValidateNested({ each: true })
    @Type(() => TemplateFieldDto)
    fieldConfig: TemplateFieldDto[];

    /**
     * 启用状态
     */
    @IsNumber({}, { message: "启用状态必须是数字" })
    @IsOptional()
    isEnabled?: BooleanNumberType = BooleanNumber.YES;

    /**
     * 排序权重
     */
    @IsInt({ message: "排序权重必须是整数" })
    @IsOptional()
    sortOrder?: number = 0;
}

/**
 * 更新密钥模板DTO
 */
export class UpdateSecretTemplateDto extends PartialType(CreateSecretTemplateDto) {}

/**
 * 查询密钥模板DTO
 */
export class QuerySecretTemplateDto extends PaginationDto {
    /**
     * 模板名称
     * 支持模糊查询
     */
    @IsString({ message: "模板名称必须是字符串" })
    @IsOptional()
    name?: string;

    /**
     * 启用状态
     */
    @IsNumber({}, { message: "启用状态必须是数字" })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined || value === null) return value;

        return Number(value);
    })
    isEnabled?: BooleanNumberType;
}

/**
 * 导入JSON创建密钥模板DTO
 */
export class ImportSecretTemplateJsonDto {
    /**
     * JSON字符串或对象
     * 必须包含有效的密钥模板数据
     */
    @IsJSON({ message: "必须提供有效的JSON数据" })
    @IsNotEmpty({ message: "JSON数据不能为空" })
    jsonData: string;
}
