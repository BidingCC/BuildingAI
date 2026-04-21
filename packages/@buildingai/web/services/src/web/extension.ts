import type { RequestConfig } from "@buildingai/http";
import type { QueryOptionsUtil } from "@buildingai/web-types";
import { useQuery } from "@tanstack/react-query";

import { apiHttpClient } from "../base";
import type { Extension } from "../console/extension";

export function fetchWebExtensionDetail(identifier: string, config?: RequestConfig) {
    return apiHttpClient.get<Extension>(`/extension/detail/${identifier}`, config);
}

/**
 * Get public extension detail by identifier.
 */
export function useWebExtensionDetailQuery(
    identifier: string,
    options?: QueryOptionsUtil<Extension>,
) {
    return useQuery<Extension>({
        queryKey: ["web", "extension", "detail", identifier],
        queryFn: () => fetchWebExtensionDetail(identifier),
        enabled: !!identifier && options?.enabled !== false,
        ...options,
    });
}
