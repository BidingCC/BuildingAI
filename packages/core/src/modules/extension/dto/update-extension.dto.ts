import {
    ExtensionStatus,
    type ExtensionStatusType,
} from "@buildingai/constants/shared/extension.constant";
import { PartialType } from "@nestjs/mapped-types";
import { ArrayNotEmpty, IsArray, IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

import { CreateExtensionDto } from "./create-extension.dto";

/**
 * Update Extension DTO
 */
export class UpdateExtensionDto extends PartialType(CreateExtensionDto) {
    /**
     * alias
     */
    @IsString({ message: "alias must be a string" })
    @IsOptional()
    alias?: string;

    /**
     * alias description
     */
    @IsString({ message: "alias description must be a string" })
    @IsOptional()
    aliasDescription?: string;

    /**
     * alias icon
     */
    @IsString({ message: "alias icon must be a string" })
    @IsOptional()
    aliasIcon?: string;

    /**
     * alias show
     */
    @IsBoolean({ message: "alias show must be a boolean" })
    @IsOptional()
    aliasShow?: boolean;
}

/**
 * Batch Update Extension Status DTO
 */
export class BatchUpdateExtensionStatusDto {
    /**
     * Extension ID array
     */
    @IsArray({ message: "ids must be an array" })
    @ArrayNotEmpty({ message: "ids cannot be empty" })
    @IsString({ each: true, message: "Each id must be a string" })
    ids: string[];

    /**
     * Extension status
     */
    @IsEnum(ExtensionStatus, { message: "Extension status must be a valid enum value" })
    status: ExtensionStatusType;
}
