import { useUserInfoQuery } from "@buildingai/services/shared";
import { useAuthStore } from "@buildingai/stores";
import { useEffect } from "react";

export const useRefreshUser = (manualOnly: boolean = false) => {
    const token = useAuthStore((state) => state.auth.token);
    const { setUserInfo } = useAuthStore((state) => state.authActions);

    const { data, refetch, isFetching } = useUserInfoQuery({
        enabled: Boolean(token) && !manualOnly,
    });

    useEffect(() => {
        if (!token) {
            setUserInfo(undefined);
            return;
        }
        if (data) setUserInfo(data);
    }, [data, token, setUserInfo]);

    return { refreshUserInfo: refetch, isFetching };
};
