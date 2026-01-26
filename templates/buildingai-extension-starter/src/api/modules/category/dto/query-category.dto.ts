import { IsOptional, IsString } from "class-validator";

/**
 * Query Category DTO
 */
export class QueryCategoryDto {
    /**
     * Category name (fuzzy search)
     */
    @IsString()
    @IsOptional()
    name?: string;
}
