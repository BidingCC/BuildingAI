import { useUserConfigQuery } from "@buildingai/services/shared";
import { useAuthStore, useUserConfigStore } from "@buildingai/stores";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Hook to refresh and cache all public user configurations
 * Private groups are excluded and won't be stored in localStorage
 */
export const useRefreshUserConfig = (manualOnly: boolean = false) => {
    const token = useAuthStore((state) => state.auth.token);
    const setConfigs = useUserConfigStore((state) => state.userConfigActions.setConfigs);
    const clearConfigs = useUserConfigStore((state) => state.userConfigActions.clearConfigs);
    const queryClient = useQueryClient();

    const { data, refetch, isFetching } = useUserConfigQuery({
        enabled: Boolean(token) && !manualOnly,
    });

    // Clear query cache and configs when token is removed (logout)
    useEffect(() => {
        if (!token) {
            queryClient.removeQueries({ queryKey: ["user", "config"] });
            clearConfigs();
        }
    }, [token, queryClient, clearConfigs]);

    // Set configs when data is available and token exists
    useEffect(() => {
        if (token && data) {
            setConfigs(data);
        }
    }, [data, token, setConfigs]);

    return { refreshUserConfig: refetch, isFetching };
};
