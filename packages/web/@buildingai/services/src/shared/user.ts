import type { UserInfo } from "@buildingai/web-types";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export function useUserInfoQuery(
    options?: Omit<UseQueryOptions<UserInfo>, "queryKey" | "queryFn">,
) {
    return useQuery<UserInfo>({
        queryKey: ["user", "info"],
        queryFn: () => apiHttpClient.get<UserInfo>("/user/info"),
        ...options,
    });
}
