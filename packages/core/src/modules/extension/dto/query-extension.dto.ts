import {
    ExtensionStatus,
    type ExtensionStatusType,
    ExtensionType,
    type ExtensionTypeType,
} from "@buildingai/constants/shared/extension.constant";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

/**
 * Query Extension DTO
 */
export class QueryExtensionDto extends PaginationDto {
    /**
     * Keyword for searching extension name or identifier (fuzzy search)
     */
    @IsString({ message: "Keyword must be a string" })
    @IsOptional()
    keyword?: string;

    /**
     * Extension identifier (fuzzy search)
     */
    @IsString({ message: "Extension identifier must be a string" })
    @IsOptional()
    identifier?: string;

    /**
     * Extension type
     */
    @IsEnum(ExtensionType, { message: "Extension type must be a valid enum value" })
    @IsOptional()
    type?: ExtensionTypeType;

    /**
     * Extension status
     */
    @Transform(({ value }) => {
        if (value === undefined || value === null || value === "") {
            return undefined;
        }
        const numericValue = Number(value);
        return Number.isNaN(numericValue) ? value : numericValue;
    })
    @IsEnum(ExtensionStatus, { message: "Extension status must be a valid enum value" })
    @IsOptional()
    status?: ExtensionStatusType;

    /**
     * Whether it is a local development plugin
     */
    @IsOptional()
    @IsBoolean({ message: "isLocal must be a boolean value" })
    @Transform(({ value }) => value === true || value === "true")
    isLocal?: boolean;

    /**
     * Whether it is installed
     */
    @IsOptional()
    @IsBoolean({ message: "isInstalled must be a boolean value" })
    @Transform(({ value }) => value === true || value === "true")
    isInstalled?: boolean;
}
