import type { WebsiteConfig } from "@buildingai/web-types";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export function useWebsiteConfigQuery(
    options?: Omit<UseQueryOptions<WebsiteConfig>, "queryKey" | "queryFn">,
) {
    return useQuery<WebsiteConfig>({
        queryKey: ["config", "website"],
        queryFn: () => apiHttpClient.get<WebsiteConfig>("/config"),
        ...options,
    });
}
