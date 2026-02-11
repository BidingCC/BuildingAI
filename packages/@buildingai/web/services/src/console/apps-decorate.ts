import type {
    MutationOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
} from "@buildingai/web-types";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";
import type { Extension } from "./extension";

export type AppsDecorateLinkItem = {
    type?: string;
    name?: string;
    path?: string;
    query?: Record<string, unknown>;
};

export type AppsDecorateBannerItem = {
    imageUrl: string;
    linkUrl?: string;
};

export type AppsDecorateConfig = {
    enabled: boolean;
    title: string;
    description: string;
    /**
     * Banner 列表（优先使用此字段）
     */
    banners?: AppsDecorateBannerItem[];
    /**
     * 单个链接配置（向后兼容，已废弃）
     * @deprecated 使用 banners 字段替代
     */
    link?: AppsDecorateLinkItem;
    /**
     * 单个图片 URL（向后兼容，已废弃）
     * @deprecated 使用 banners 字段替代
     */
    heroImageUrl?: string;
};

export type SetAppsDecorateDto = {
    enabled: boolean;
    title: string;
    description?: string;
    banners?: AppsDecorateBannerItem[];
    link?: AppsDecorateLinkItem;
    heroImageUrl?: string;
};

// ==================== 应用装饰项类型 ====================

export type UpdateItemDecorationDto = {
    alias?: string;
    aliasDescription?: string;
    aliasIcon?: string;
    aliasShow?: boolean;
    appCenterTagIds?: string[];
    appCenterSort?: number;
};

export type BatchSortItem = {
    id: string;
    sort: number;
};

// ==================== Config Hooks ====================

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

// ==================== Items Hooks ====================

/**
 * 分页查询应用装饰项列表（普通分页）
 */
export function useAppsDecorateItemsQuery(
    params?: { page?: number; pageSize?: number; keyword?: string; tagId?: string },
    options?: QueryOptionsUtil<PaginatedResponse<Extension>>,
) {
    return useQuery<PaginatedResponse<Extension>>({
        queryKey: ["apps-decorate", "items", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<Extension>>("/apps-decorate/items", {
                params,
            }),
        ...options,
    });
}

/**
 * 无限滚动查询应用装饰项列表
 */
export function useAppsDecorateItemsInfiniteQuery(
    params?: { keyword?: string; tagId?: string; pageSize?: number },
    options?: { enabled?: boolean },
) {
    const pageSize = params?.pageSize ?? 20;
    return useInfiniteQuery<PaginatedResponse<Extension>>({
        queryKey: ["apps-decorate", "items-infinite", params],
        queryFn: ({ pageParam }) =>
            consoleHttpClient.get<PaginatedResponse<Extension>>("/apps-decorate/items", {
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

/**
 * 更新单个应用装饰项
 */
export function useUpdateItemDecorationMutation(
    options?: MutationOptionsUtil<Extension, { extensionId: string; dto: UpdateItemDecorationDto }>,
) {
    return useMutation<Extension, Error, { extensionId: string; dto: UpdateItemDecorationDto }>({
        mutationFn: ({ extensionId, dto }) =>
            consoleHttpClient.put<Extension>(`/apps-decorate/items/${extensionId}`, dto),
        ...options,
    });
}

/**
 * 批量更新排序
 */
export function useBatchUpdateSortMutation(
    options?: MutationOptionsUtil<{ success: boolean }, { items: BatchSortItem[] }>,
) {
    return useMutation<{ success: boolean }, Error, { items: BatchSortItem[] }>({
        mutationFn: (dto) =>
            consoleHttpClient.post<{ success: boolean }>("/apps-decorate/items/sort", dto),
        ...options,
    });
}
