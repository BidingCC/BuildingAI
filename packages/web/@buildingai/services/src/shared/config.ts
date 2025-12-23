import type { WebsiteConfig } from "@buildingai/web-types";

import { apiHttpClient } from "../base";

export const getWebsiteConfig = (): Promise<WebsiteConfig> => {
    return apiHttpClient.get<WebsiteConfig>("/config");
};
