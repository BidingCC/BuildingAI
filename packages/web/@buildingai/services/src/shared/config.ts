import type { InitializeStatus, WebsiteConfig } from "@buildingai/web-types";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { apiHttpClient, consoleHttpClient } from "../base";

export function useWebsiteConfigQuery(
    options?: Omit<UseQueryOptions<WebsiteConfig>, "queryKey" | "queryFn">,
) {
    return useQuery<WebsiteConfig>({
        queryKey: ["config", "website"],
        queryFn: () => apiHttpClient.get<WebsiteConfig>("/config"),
        ...options,
    });
}

export function useInitializeStatus(
    options?: Omit<UseQueryOptions<InitializeStatus>, "queryKey" | "queryFn">,
) {
    return useQuery<InitializeStatus>({
        queryKey: ["initialize-status"],
        queryFn: () => consoleHttpClient.get<InitializeStatus>("/system/initialize"),
        ...options,
    });
}
