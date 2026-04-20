import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

export class ListAgentConversationsDto extends PaginationDto {
    @IsOptional()
    @IsString()
    keyword?: string;

    @IsOptional()
    @IsString()
    @IsIn(["createdAt", "updatedAt"], { message: "sortBy 须为 createdAt 或 updatedAt" })
    sortBy?: "createdAt" | "updatedAt";

    /**
     * Whether to include debug conversations in the result.
     * When omitted, debug conversations are excluded by default.
     */
    @IsOptional()
    @Transform(({ value }) => value === "true" || value === true)
    @IsBoolean()
    includeDebug?: boolean;

    @IsOptional()
    @Transform(({ value }) => value === "true" || value === true)
    @IsBoolean()
    includeAnonymous?: boolean;
}
