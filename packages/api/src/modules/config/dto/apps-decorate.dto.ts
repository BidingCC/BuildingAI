import { PaginationDto } from "@buildingai/dto";
import { Type } from "class-transformer";
import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    ValidateIf,
    ValidateNested,
} from "class-validator";

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
 * Banner 项 DTO
 */
export class AppsDecorateBannerItemDto {
    @IsString()
    imageUrl!: string;

    @IsOptional()
    @IsString()
    linkUrl?: string;
}

/**
 * 应用中心装饰配置 DTO
 */
export class AppsDecorateDto {
    @IsBoolean()
    enabled!: boolean;

    @IsString()
    title!: string;

    /**
     * 页面描述
     */
    @IsOptional()
    @IsString()
    description?: string;

    /**
     * Banner 列表（优先使用此字段）
     */
    @IsOptional()
    @ValidateIf((o) => o.banners !== undefined)
    @IsArray({ message: "banners 必须是数组" })
    @ArrayMinSize(1, { message: "至少需要一个 Banner" })
    @ValidateNested({ each: true })
    @Type(() => AppsDecorateBannerItemDto)
    banners?: AppsDecorateBannerItemDto[];

    /**
     * 单个链接配置（向后兼容，已废弃，使用 banners 替代）
     * @deprecated 使用 banners 字段替代
     */
    @IsOptional()
    @ValidateNested()
    @Type(() => AppsDecorateLinkItemDto)
    link?: AppsDecorateLinkItemDto;

    /**
     * 单个图片 URL（向后兼容，已废弃，使用 banners 替代）
     * @deprecated 使用 banners 字段替代
     */
    @IsOptional()
    @IsString()
    heroImageUrl?: string;
}

// ==================== 应用装饰项 DTO ====================

/**
 * 查询应用装饰项列表 DTO（分页）
 */
export class QueryAppsDecorateItemsDto extends PaginationDto {
    @IsOptional()
    @IsString()
    keyword?: string;

    @IsOptional()
    @IsString()
    tagId?: string;
}

/**
 * 更新单个应用装饰项 DTO
 */
export class UpdateItemDecorationDto {
    @IsOptional()
    @IsString()
    alias?: string;

    @IsOptional()
    @IsString()
    aliasDescription?: string;

    @IsOptional()
    @IsString()
    aliasIcon?: string;

    @IsOptional()
    @IsBoolean()
    aliasShow?: boolean;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    appCenterTagIds?: string[];

    @IsOptional()
    @IsNumber()
    appCenterSort?: number;
}

/**
 * 批量排序项
 */
export class SortItemDto {
    @IsString()
    id!: string;

    @IsNumber()
    sort!: number;
}

/**
 * 批量更新排序 DTO
 */
export class BatchUpdateSortDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SortItemDto)
    items!: SortItemDto[];
}
