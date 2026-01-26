import { PaginationDto } from "@buildingai/dto";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

import { ArticleStatus } from "../../../db/entities/article.entity";

/**
 * Query Article DTO
 */
export class QueryArticleDto extends PaginationDto {
    /**
     * Article title (fuzzy search)
     */
    @IsString()
    @IsOptional()
    title?: string;

    /**
     * Article status
     */
    @IsEnum(ArticleStatus)
    @IsOptional()
    status?: ArticleStatus;

    /**
     * Category ID
     */
    @IsUUID("4")
    @IsOptional()
    categoryId?: string;
}
