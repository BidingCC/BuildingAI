import type { PaginatedResponse, QueryOptionsUtil } from "@buildingai/web-types";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { apiHttpClient } from "../base";
import type { Extension } from "../console/extension";

export type AppsDecorateBannerItem = {
    imageUrl: string;
    linkUrl?: string;
};

export type AppsDecorateConfig = {
    enabled: boolean;
    title: string;
    description: string;
    banners?: AppsDecorateBannerItem[];
};

// ==================== Config Hooks ====================

export function useWebAppsDecorateQuery(options?: QueryOptionsUtil<AppsDecorateConfig>) {
    return useQuery<AppsDecorateConfig>({
        queryKey: ["web", "apps-decorate", "config"],
        queryFn: () => apiHttpClient.get<AppsDecorateConfig>("/apps-decorate"),
        ...options,
    });
}

// ==================== Items Hooks ====================

/**
 * 前台无限滚动查询应用列表
 */
export function useWebAppsDecorateItemsInfiniteQuery(
    params?: { keyword?: string; tagId?: string; pageSize?: number },
    options?: { enabled?: boolean },
) {
    const pageSize = params?.pageSize ?? 20;
    return useInfiniteQuery<PaginatedResponse<Extension>>({
        queryKey: ["web", "apps-decorate", "items-infinite", params],
        queryFn: ({ pageParam }) =>
            apiHttpClient.get<PaginatedResponse<Extension>>("/apps-decorate/items", {
                params: {
                    page: pageParam,
                    pageSize,
                    keyword: params?.keyword,
                    tagId: params?.tagId,
                },
            }),
        getNextPageParam: (lastPage) =>
            lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
        initialPageParam: 1,
        ...options,
    });
}
