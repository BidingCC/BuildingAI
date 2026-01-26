import { DictService } from "@buildingai/dict";
import { Injectable } from "@nestjs/common";

const GROUP = "agent-decorate";
const KEY = "config";
const FILE_URL_FIELDS = ["heroImageUrl", "overlayIconUrl"];

export interface AgentDecorateLinkItem {
    type?: string;
    name?: string;
    path?: string;
    query?: Record<string, unknown>;
}

export interface AgentDecorateConfig {
    enabled: boolean;
    title: string;
    description: string;
    link: AgentDecorateLinkItem;
    heroImageUrl: string;
    overlayTitle: string;
    overlayDescription: string;
    overlayIconUrl: string;
}

const DEFAULT_CONFIG: AgentDecorateConfig = {
    enabled: false,
    title: "",
    description: "",
    link: {},
    heroImageUrl: "",
    overlayTitle: "",
    overlayDescription: "",
    overlayIconUrl: "",
};

@Injectable()
export class AgentDecorateService {
    constructor(private readonly dictService: DictService) {}

    async getConfig(): Promise<AgentDecorateConfig> {
        const stored = await this.dictService.get<Partial<AgentDecorateConfig>>(
            KEY,
            undefined,
            GROUP,
            { restoreFileUrlFields: FILE_URL_FIELDS },
        );
        return { ...DEFAULT_CONFIG, ...(stored || {}) } as AgentDecorateConfig;
    }

    async setConfig(payload: AgentDecorateConfig): Promise<AgentDecorateConfig> {
        await this.dictService.set(KEY, payload, {
            group: GROUP,
            description: "agent-decorate 配置",
            normalizeFileUrlFields: FILE_URL_FIELDS,
        });
        return this.getConfig();
    }
}
