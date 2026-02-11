import { DictService } from "@buildingai/dict";
import { Injectable } from "@nestjs/common";

import type {
    GoogleOaConfig,
    GoogleOaConfigResponse,
    SetGoogleOaConfigDto,
} from "../dto/google-oa.dto";

const DICT_KEY = "google_oa_config";
const DICT_GROUP = "auth";
const LEGACY_DICT_KEY = "google_oauth_config";

@Injectable()
export class GoogleOaConfigService {
    constructor(private readonly dictService: DictService) {}

    async getConfig(): Promise<GoogleOaConfigResponse> {
        const config =
            (await this.dictService.get<GoogleOaConfig | null>(DICT_KEY, null, DICT_GROUP)) ??
            (await this.dictService.get<GoogleOaConfig | null>(LEGACY_DICT_KEY, null, DICT_GROUP));
        const baseUrl = (process.env.APP_DOMAIN || "http://localhost:4090").replace(/\/$/, "");
        const redirectUri = `${baseUrl}/api/auth/google/callback`;
        if (!config) return { clientSecretConfigured: false, redirectUri };
        return {
            clientId: config.clientId,
            clientSecretConfigured: !!config.clientSecret,
            redirectUri,
        };
    }

    async getFullConfig(): Promise<GoogleOaConfig | null> {
        return (
            (await this.dictService.get<GoogleOaConfig | null>(DICT_KEY, null, DICT_GROUP)) ??
            (await this.dictService.get<GoogleOaConfig | null>(LEGACY_DICT_KEY, null, DICT_GROUP))
        );
    }

    async setConfig(dto: SetGoogleOaConfigDto): Promise<{ success: boolean }> {
        const existing = await this.getFullConfig();
        const payload: GoogleOaConfig = {
            clientId: dto.clientId,
            clientSecret:
                (dto.clientSecret?.trim() && dto.clientSecret) || existing?.clientSecret || "",
        };
        await this.dictService.set(DICT_KEY, payload, {
            group: DICT_GROUP,
            description: "谷歌登录配置",
        });
        return { success: true };
    }
}
