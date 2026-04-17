import type { QueryOptionsUtil } from "@buildingai/web-types";
import { useQuery } from "@tanstack/react-query";

import { apiHttpClient } from "../base";
import type { Extension } from "../console/extension";

/**
 * Get public extension detail by identifier.
 */
export function useWebExtensionDetailQuery(
    identifier: string,
    options?: QueryOptionsUtil<Extension>,
) {
    return useQuery<Extension>({
        queryKey: ["web", "extension", "detail", identifier],
        queryFn: () => apiHttpClient.get<Extension>(`/extension/detail/${identifier}`),
        enabled: !!identifier && options?.enabled !== false,
        ...options,
    });
}
