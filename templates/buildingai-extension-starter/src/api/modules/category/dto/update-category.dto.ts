import { IsInt, IsOptional, IsString, Length, Min } from "class-validator";

/**
 * Update Category DTO
 */
export class UpdateCategoryDto {
    /**
     * Category name
     */
    @IsString({ message: "Category name must be a string" })
    @IsOptional()
    @Length(1, 100, { message: "Category name length must be between 1 and 100 characters" })
    name?: string;

    /**
     * Category description
     */
    @IsString({ message: "Category description must be a string" })
    @IsOptional()
    description?: string;

    /**
     * Sort order
     */
    @IsInt({ message: "Sort order must be an integer" })
    @Min(0, { message: "Sort order must be greater than or equal to 0" })
    @IsOptional()
    sort?: number;
}
