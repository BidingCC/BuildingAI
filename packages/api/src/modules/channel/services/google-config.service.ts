import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Dict } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { DictService } from "@buildingai/dict";
import { UpdateGoogleConfigDto } from "@modules/channel/dto/google-config.dto";
import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

export const GOOGLE_EVENTS = {
    REFRESH: "google.access_token.refresh",
} as const;

export type GoogleConfig = {
    clientId: string;
    clientSecret: string;
    enabled: boolean;
};

@Injectable()
export class GoogleConfigService extends BaseService<Dict> {
    private readonly GROUP = "googleConfig";

    constructor(
        private readonly dictService: DictService,
        @InjectRepository(Dict) repository: Repository<Dict>,
        private readonly eventEmitter: EventEmitter2,
    ) {
        super(repository);
    }

    async getConfig(): Promise<GoogleConfig> {
        const defaultConfig: GoogleConfig = {
            clientId: "",
            clientSecret: "",
            enabled: false,
        };

        try {
            const items = await this.dictService.findAll({
                where: { group: this.GROUP },
            });

            if (items.length === 0) {
                return defaultConfig;
            }

            return {
                clientId: items.find((i) => i.key === "clientId")?.value || "",
                clientSecret: items.find((i) => i.key === "clientSecret")?.value || "",
                enabled: items.find((i) => i.key === "enabled")?.value === "true",
            };
        } catch (error) {
            this.logger.error(`获取 ${this.GROUP} 配置失败: ${error.message}`);
            return defaultConfig;
        }
    }

    async updateConfig(dto: UpdateGoogleConfigDto): Promise<void> {
        try {
            const entries = Object.entries(dto).filter(([, v]) => v !== undefined);
            for (const [key, value] of entries) {
                await this.dictService.set(key, String(value), {
                    group: this.GROUP,
                    description: `配置 - ${key}`,
                });
            }
            this.eventEmitter.emit(GOOGLE_EVENTS.REFRESH);
        } catch (error) {
            this.logger.error(`更新 ${this.GROUP} 配置失败: ${error.message}`);
            throw error;
        }
    }
}
