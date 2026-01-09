import type {
    InitializeStatus,
    MutationOptionsUtil,
    QueryOptionsUtil,
    UserInfo,
    WebsiteConfig,
} from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { apiHttpClient, consoleHttpClient } from "../base";

interface InitializeStatusResponse {
    isInitialized: boolean;
    token: string;
    expiresAt: string;
    user: UserInfo;
}

export interface InitializeStatusRequest {
    username: string;
    password: string;
    confirmPassword: string;
    email?: string;
    avatar?: string;
    websiteName?: string;
    websiteDescription?: string;
    websiteLogo?: string;
    websiteIcon?: string;
}

export function useWebsiteConfigQuery(options?: QueryOptionsUtil<WebsiteConfig>) {
    return useQuery<WebsiteConfig>({
        queryKey: ["config", "website"],
        queryFn: () => apiHttpClient.get<WebsiteConfig>("/config"),
        ...options,
    });
}

export function useCheckInitializeStatus(options?: QueryOptionsUtil<InitializeStatus>) {
    return useQuery<InitializeStatus>({
        queryKey: ["initialize-status"],
        queryFn: () => consoleHttpClient.get<InitializeStatus>("/system/initialize"),
        ...options,
    });
}

export function useInitializeMutation(
    data: InitializeStatusRequest,
    options?: MutationOptionsUtil<InitializeStatusResponse, InitializeStatusRequest>,
) {
    return useMutation<InitializeStatusResponse, Error, InitializeStatusRequest>({
        mutationFn: () =>
            consoleHttpClient.post<InitializeStatusResponse>("/system/initialize", data),
        ...options,
    });
}
