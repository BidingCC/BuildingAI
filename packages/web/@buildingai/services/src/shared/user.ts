import type { QueryOptionsUtil, UserInfo } from "@buildingai/web-types";
import { useQuery } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export function useUserInfoQuery(options?: QueryOptionsUtil<UserInfo>) {
    return useQuery<UserInfo>({
        queryKey: ["user", "info"],
        queryFn: () => apiHttpClient.get<UserInfo>("/user/info"),
        ...options,
    });
}
