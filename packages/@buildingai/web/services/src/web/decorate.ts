import type { QueryOptionsUtil } from "@buildingai/web-types";
import { useQuery } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

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

export function useDecorateMenuQuery(options?: QueryOptionsUtil<DecorateMenuConfig>) {
    return useQuery<DecorateMenuConfig>({
        queryKey: ["decorate", "menu"],
        queryFn: () => apiHttpClient.get<DecorateMenuConfig>("/decorate/menu"),
        ...options,
    });
}
