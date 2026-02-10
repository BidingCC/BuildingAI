import { useUserInfoQuery } from "@buildingai/services/shared";
import { useAuthStore } from "@buildingai/stores";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export const useRefreshUser = (manualOnly: boolean = false) => {
    const token = useAuthStore((state) => state.auth.token);
    const setUserInfo = useAuthStore((state) => state.authActions.setUserInfo);
    const queryClient = useQueryClient();

    const { data, refetch, isFetching } = useUserInfoQuery({
        enabled: Boolean(token) && !manualOnly,
    });

    // Clear query cache and userInfo when token is removed (logout)
    useEffect(() => {
        if (!token) {
            queryClient.removeQueries({ queryKey: ["user", "info"] });
        }
    }, [token, queryClient]);

    // Set userInfo when data is available and token exists
    useEffect(() => {
        if (token && data) {
            setUserInfo(data);
        }
    }, [data, token, setUserInfo]);

    return { refreshUserInfo: refetch, isFetching };
};
