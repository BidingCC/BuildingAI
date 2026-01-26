import { Type } from "class-transformer";
import { IsBoolean, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";

/**
 * 应用中心装饰链接项 DTO
 */
export class AppsDecorateLinkItemDto {
    @IsOptional()
    @IsString()
    type?: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    path?: string;

    @IsOptional()
    @IsObject()
    query?: Record<string, unknown>;
}

/**
 * 应用中心装饰配置 DTO
 */
export class AppsDecorateDto {
    @IsBoolean()
    enabled!: boolean;

    @IsString()
    title!: string;

    @ValidateNested()
    @Type(() => AppsDecorateLinkItemDto)
    link!: AppsDecorateLinkItemDto;

    @IsString()
    heroImageUrl!: string;
}
