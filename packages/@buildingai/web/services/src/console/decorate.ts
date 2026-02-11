import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type DecorateMenuLink = {
    label: string;
    path: string;
    type: "system" | "extension" | "custom" | "button";
    query: Record<string, string>;
    component: string | null;
    target: "_self" | "_blank";
};

export type DecorateMenuItem = {
    id: string;
    icon: string;
    title: string;
    link: DecorateMenuLink;
    isHidden?: boolean;
};

export type DecorateMenuGroup = {
    id: string;
    title: string;
    isHidden?: boolean;
    items: DecorateMenuItem[];
};

export type DecorateMenuConfig = {
    layout: string;
    menus: DecorateMenuItem[];
    groups?: DecorateMenuGroup[];
};

export type PluginLink = {
    id: string;
    name: string;
    path: string;
    icon?: string;
};

export type PluginLinksResponse = {
    data: PluginLink[];
    total: number;
    timestamp: string;
};

export function useDecorateMenuConfigQuery(options?: QueryOptionsUtil<DecorateMenuConfig>) {
    return useQuery<DecorateMenuConfig>({
        queryKey: ["decorate-page", "menu"],
        queryFn: () => consoleHttpClient.get<DecorateMenuConfig>("/decorate-page/menu"),
        ...options,
    });
}

export function useSetDecorateMenuConfigMutation(
    options?: MutationOptionsUtil<DecorateMenuConfig, DecorateMenuConfig>,
) {
    const queryClient = useQueryClient();
    return useMutation<DecorateMenuConfig, Error, DecorateMenuConfig>({
        mutationFn: (dto) => consoleHttpClient.put<DecorateMenuConfig>("/decorate-page/menu", dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["decorate-page", "menu"] });
        },
        ...options,
    });
}

export function usePluginLinksQuery(options?: QueryOptionsUtil<PluginLinksResponse>) {
    return useQuery<PluginLinksResponse>({
        queryKey: ["decorate-page", "plugin-links"],
        queryFn: () => consoleHttpClient.get<PluginLinksResponse>("/decorate-page/plugin-links"),
        ...options,
    });
}
