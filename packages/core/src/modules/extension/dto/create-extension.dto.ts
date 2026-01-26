import {
    ExtensionStatus,
    type ExtensionStatusType,
    ExtensionSupportTerminal,
    type ExtensionSupportTerminalType,
    ExtensionType,
    type ExtensionTypeType,
} from "@buildingai/constants/shared/extension.constant";
import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsDefined,
    IsEnum,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from "class-validator";

import {
    IsValidNpmPackageName,
    NormalizeExtensionIdentifier,
} from "../validators/extension-identifier.validator";

/**
 * Extension author information DTO
 */
export class ExtensionAuthorDto {
    /**
     * Author avatar URL
     */
    @IsString({ message: "Author avatar must be a string" })
    @IsOptional()
    avatar?: string;

    /**
     * Author name
     */
    @IsString({ message: "Author name must be a string" })
    @IsOptional()
    @MaxLength(100, { message: "Author name length cannot exceed 100 characters" })
    name?: string;

    /**
     * Author homepage URL
     */
    @IsString({ message: "Author homepage must be a string" })
    @IsOptional()
    homepage?: string;
}

/**
 * Create Extension DTO
 */
export class CreateExtensionDto {
    /**
     * Extension name
     */
    @IsDefined({ message: "Extension name parameter is required" })
    @IsString({ message: "Extension name must be a string" })
    @IsNotEmpty({ message: "Extension name cannot be empty" })
    @MaxLength(100, { message: "Extension name length cannot exceed 100 characters" })
    name: string;

    /**
     * Extension identifier
     */
    @NormalizeExtensionIdentifier()
    @IsDefined({ message: "Extension identifier parameter is required" })
    @IsString({ message: "Extension identifier must be a string" })
    @IsNotEmpty({ message: "Extension identifier cannot be empty" })
    @MaxLength(214, { message: "Extension identifier length cannot exceed 214 characters" })
    @IsValidNpmPackageName()
    identifier: string;

    /**
     * Extension version
     */
    @IsString({ message: "Extension version must be a string" })
    @IsOptional()
    @MaxLength(20, { message: "Extension version length cannot exceed 20 characters" })
    version?: string;

    /**
     * Extension description
     */
    @IsString({ message: "Extension description must be a string" })
    @IsOptional()
    description?: string;

    /**
     * Extension icon
     */
    @IsString({ message: "Extension icon must be a string" })
    @IsOptional()
    icon?: string;

    /**
     * Extension type
     */
    @IsEnum(ExtensionType, { message: "Extension type must be a valid enum value" })
    @IsOptional()
    type?: ExtensionTypeType;

    /**
     * Extension supported terminal types
     */
    @IsOptional()
    @IsArray({ message: "Extension support terminal must be an array" })
    @IsEnum(ExtensionSupportTerminal, {
        each: true,
        message: "Each plugin support terminal must be a valid enum value",
    })
    supportTerminal?: ExtensionSupportTerminalType[];

    /**
     * Whether it is a local development plugin
     */
    @IsBoolean({ message: "isLocal must be a boolean value" })
    @IsOptional()
    isLocal?: boolean;

    /**
     * Extension status
     */
    @IsEnum(ExtensionStatus, { message: "Extension status must be a valid enum value" })
    @IsOptional()
    status?: ExtensionStatusType;

    /**
     * Extension author information
     */
    @IsOptional()
    @ValidateNested()
    @Type(() => ExtensionAuthorDto)
    author?: ExtensionAuthorDto;

    /**
     * Extension homepage or repository URL
     */
    @IsString({ message: "Extension homepage must be a string" })
    @IsOptional()
    homepage?: string;

    /**
     * Extension documentation URL
     */
    @IsString({ message: "Extension documentation must be a string" })
    @IsOptional()
    documentation?: string;

    /**
     * Extension configuration parameters
     */
    @IsObject({ message: "Extension config must be an object" })
    @IsOptional()
    config?: Record<string, any>;
}
