import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Min } from "class-validator";

import { ArticleStatus } from "../../../db/entities/article.entity";

/**
 * Create Article DTO
 */
export class CreateArticleDto {
    /**
     * Article title
     */
    @IsString({ message: "Article title must be a string" })
    @Length(1, 200, { message: "Article title length must be between 1 and 200 characters" })
    title: string;

    /**
     * Article summary
     */
    @IsString({ message: "Article summary must be a string" })
    @IsOptional()
    summary?: string;

    /**
     * Article content
     */
    @IsString({ message: "Article content must be a string" })
    content: string;

    /**
     * Cover image URL
     */
    @IsString({ message: "Cover image URL must be a string" })
    @IsOptional()
    @Length(0, 500, { message: "Cover image URL length must not exceed 500 characters" })
    cover?: string;

    /**
     * Article status
     */
    @IsEnum(ArticleStatus, { message: "Article status must be a valid enum value" })
    @IsOptional()
    status?: ArticleStatus;

    /**
     * Sort order
     */
    @IsInt({ message: "Sort order must be an integer" })
    @Min(0, { message: "Sort order must be greater than or equal to 0" })
    @IsOptional()
    sort?: number;

    /**
     * Category ID
     */
    @IsUUID("4", { message: "Category ID must be a valid UUID" })
    @IsOptional()
    categoryId?: string;
}
