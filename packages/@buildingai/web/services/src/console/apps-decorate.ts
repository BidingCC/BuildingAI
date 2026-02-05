import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type AppsDecorateLinkItem = {
    type?: string;
    name?: string;
    path?: string;
    query?: Record<string, unknown>;
};

export type AppsDecorateConfig = {
    enabled: boolean;
    title: string;
    link: AppsDecorateLinkItem;
    heroImageUrl: string;
};

export type SetAppsDecorateDto = {
    enabled: boolean;
    title: string;
    link: AppsDecorateLinkItem;
    heroImageUrl: string;
};

export function useAppsDecorateQuery(options?: QueryOptionsUtil<AppsDecorateConfig>) {
    return useQuery<AppsDecorateConfig>({
        queryKey: ["apps-decorate", "config"],
        queryFn: () => consoleHttpClient.get<AppsDecorateConfig>("/apps-decorate"),
        ...options,
    });
}

export function useSetAppsDecorateMutation(
    options?: MutationOptionsUtil<AppsDecorateConfig, SetAppsDecorateDto>,
) {
    return useMutation<AppsDecorateConfig, Error, SetAppsDecorateDto>({
        mutationFn: (dto) => consoleHttpClient.post<AppsDecorateConfig>("/apps-decorate", dto),
        ...options,
    });
}
