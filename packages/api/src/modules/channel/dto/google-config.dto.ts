import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateGoogleConfigDto {
    @IsString()
    @IsOptional()
    clientId?: string;

    @IsString()
    @IsOptional()
    clientSecret?: string;

    @IsBoolean()
    @IsOptional()
    enabled?: boolean;
}
