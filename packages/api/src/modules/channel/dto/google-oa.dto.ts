import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export interface GoogleOaConfig {
    clientId: string;
    clientSecret: string;
}

export interface GoogleOaConfigResponse {
    clientId?: string;
    clientSecretConfigured: boolean;
    redirectUri: string;
}

export class SetGoogleOaConfigDto {
    @IsNotEmpty()
    @IsString()
    clientId: string;

    @IsOptional()
    @IsString()
    clientSecret?: string;
}
