import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export const PM2_LOG_ROTATE_PRESETS = [
    "hourly",
    "every-6-hours",
    "daily",
    "weekly",
    "monthly",
    "custom",
] as const;

export type Pm2LogRotatePreset = (typeof PM2_LOG_ROTATE_PRESETS)[number];

export type Pm2LogRotateConfig = {
    enabled: boolean;
    maxSize: string;
    retain: number;
    compress: boolean;
    preset: Pm2LogRotatePreset;
    rotateInterval: string;
    timezone: string;
    archiveByMonth: boolean;
    moduleInstalled?: boolean;
};

export type Pm2LogRotateApplyResult = {
    installed: boolean;
    applied: boolean;
    config: Pm2LogRotateConfig;
};

export type Pm2LogRotateStatus = {
    installed: boolean;
    config: Pm2LogRotateConfig;
    message?: string;
};

export function usePm2LogRotateConfigQuery(options?: QueryOptionsUtil<Pm2LogRotateConfig>) {
    return useQuery<Pm2LogRotateConfig>({
        queryKey: ["pm2", "log-rotate", "config"],
        queryFn: () => consoleHttpClient.get<Pm2LogRotateConfig>("/pm2/log-rotate/config"),
        ...options,
    });
}

export function usePm2LogRotateStatusQuery(options?: QueryOptionsUtil<Pm2LogRotateStatus>) {
    return useQuery<Pm2LogRotateStatus>({
        queryKey: ["pm2", "log-rotate", "status"],
        queryFn: () => consoleHttpClient.get<Pm2LogRotateStatus>("/pm2/log-rotate/status"),
        ...options,
    });
}

export function useSetPm2LogRotateConfigMutation(
    options?: MutationOptionsUtil<Pm2LogRotateApplyResult, Pm2LogRotateConfig>,
) {
    return useMutation<Pm2LogRotateApplyResult, Error, Pm2LogRotateConfig>({
        mutationFn: (dto) =>
            consoleHttpClient.post<Pm2LogRotateApplyResult>("/pm2/log-rotate/config", dto),
        ...options,
    });
}

export function useApplyPm2LogRotateConfigMutation(
    options?: MutationOptionsUtil<Pm2LogRotateApplyResult>,
) {
    return useMutation<Pm2LogRotateApplyResult, Error>({
        mutationFn: () => consoleHttpClient.post<Pm2LogRotateApplyResult>("/pm2/log-rotate/apply"),
        ...options,
    });
}
