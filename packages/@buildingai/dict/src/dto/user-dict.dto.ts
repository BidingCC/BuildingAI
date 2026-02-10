import { IsDefined, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

/**
 * Set User Configuration DTO
 */
export class SetUserConfigDto {
    /**
     * Configuration key
     */
    @IsDefined({ message: "Configuration key parameter is required" })
    @IsString({ message: "Configuration key must be a string" })
    @IsNotEmpty({ message: "Configuration key cannot be empty" })
    @MaxLength(100, { message: "Configuration key length cannot exceed 100 characters" })
    key: string;

    /**
     * Configuration value (any JSON-serializable value)
     */
    @IsDefined({ message: "Configuration value parameter is required" })
    value: any;

    /**
     * Configuration group
     */
    @IsOptional()
    @IsString()
    @MaxLength(50, { message: "Configuration group length cannot exceed 50 characters" })
    group?: string;

    /**
     * Configuration description
     */
    @IsOptional()
    @IsString()
    @MaxLength(255, { message: "Configuration description length cannot exceed 255 characters" })
    description?: string;
}

/**
 * Batch Set User Configuration DTO
 */
export class BatchSetUserConfigDto {
    /**
     * Configuration items
     */
    @IsDefined({ message: "Configuration items parameter is required" })
    items: SetUserConfigDto[];
}

/**
 * Get User Configuration DTO
 */
export class GetUserConfigDto {
    /**
     * Configuration key
     */
    @IsDefined({ message: "Configuration key parameter is required" })
    @IsString({ message: "Configuration key must be a string" })
    @IsNotEmpty({ message: "Configuration key cannot be empty" })
    key: string;

    /**
     * Configuration group
     */
    @IsOptional()
    @IsString()
    group?: string;
}

/**
 * Batch Get User Configuration DTO
 */
export class BatchGetUserConfigDto {
    /**
     * Configuration keys with optional groups
     */
    @IsDefined({ message: "Configuration keys parameter is required" })
    keys: GetUserConfigDto[];
}

/**
 * Delete User Configuration DTO
 */
export class DeleteUserConfigDto {
    /**
     * Configuration key
     */
    @IsDefined({ message: "Configuration key parameter is required" })
    @IsString({ message: "Configuration key must be a string" })
    @IsNotEmpty({ message: "Configuration key cannot be empty" })
    key: string;

    /**
     * Configuration group
     */
    @IsOptional()
    @IsString()
    group?: string;
}
