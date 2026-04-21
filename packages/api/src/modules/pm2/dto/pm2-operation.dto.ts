import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from "class-validator";

/**
 * PM2 restart request DTO
 */
export class Pm2RestartDto {
    @IsOptional()
    @IsString()
    appName?: string;
}

/**
 * PM2 reload request DTO
 */
export class Pm2ReloadDto {
    @IsOptional()
    @IsString()
    appName?: string;
}

/**
 * PM2 stop request DTO
 */
export class Pm2StopDto {
    @IsOptional()
    @IsString()
    appName?: string;
}

/**
 * PM2 delete request DTO
 */
export class Pm2DeleteDto {
    @IsOptional()
    @IsString()
    appName?: string;
}

/**
 * PM2 logs query DTO
 */
export class Pm2LogsQueryDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(1000)
    lines?: number = 100;

    @IsOptional()
    @IsString()
    appName?: string;
}

/**
 * PM2 process info query DTO
 */
export class Pm2ProcessInfoQueryDto {
    @IsOptional()
    @IsString()
    appName?: string;
}

export const PM2_LOG_ROTATE_PRESETS = [
    "hourly",
    "every-6-hours",
    "daily",
    "weekly",
    "monthly",
    "custom",
] as const;

export type Pm2LogRotatePreset = (typeof PM2_LOG_ROTATE_PRESETS)[number];

/**
 * PM2 log rotate configuration DTO
 */
export class Pm2LogRotateConfigDto {
    @IsBoolean()
    enabled: boolean;

    @IsString()
    @Matches(/^[1-9]\d*(K|M|G)$/i, {
        message: "maxSize must use a K, M, or G suffix, for example 50M",
    })
    maxSize: string;

    @IsInt()
    @Min(1)
    @Max(365)
    retain: number;

    @IsBoolean()
    compress: boolean;

    @IsString()
    @IsIn(PM2_LOG_ROTATE_PRESETS)
    preset: Pm2LogRotatePreset;

    @IsOptional()
    @IsString()
    rotateInterval?: string;

    @IsString()
    @Matches(/^[A-Za-z_]+\/[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)?$/, {
        message: "timezone must be an IANA timezone, for example Asia/Shanghai",
    })
    timezone: string;

    @IsOptional()
    @IsBoolean()
    archiveByMonth?: boolean;
}
