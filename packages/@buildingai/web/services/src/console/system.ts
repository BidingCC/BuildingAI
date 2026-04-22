import type { QueryOptionsUtil } from "@buildingai/web-types";
import { useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type SystemRuntimeInfo = {
    version: string;
    systemId: string;
};

export function useSystemRuntimeInfoQuery(options?: QueryOptionsUtil<SystemRuntimeInfo>) {
    return useQuery<SystemRuntimeInfo>({
        queryKey: ["system", "runtime"],
        queryFn: () => consoleHttpClient.get<SystemRuntimeInfo>("/system/runtime"),
        ...options,
    });
}
