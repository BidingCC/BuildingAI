import { useUserInfoQuery } from "@buildingai/services/shared";
import { useAuthStore } from "@buildingai/stores";
import { useEffect, useRef } from "react";

export const useRefreshUser = (manualOnly: boolean = false) => {
    const token = useAuthStore((state) => state.auth.token);
    const setUserInfo = useAuthStore((state) => state.authActions.setUserInfo);
    const prevTokenRef = useRef(token);

    const { data, refetch, isFetching } = useUserInfoQuery({
        enabled: Boolean(token) && !manualOnly,
    });

    useEffect(() => {
        // Only clear userInfo when token changes from truthy to falsy (logout)
        if (prevTokenRef.current && !token) {
            setUserInfo(undefined);
        }
        prevTokenRef.current = token;
    }, [token, setUserInfo]);

    useEffect(() => {
        if (token && data) {
            setUserInfo(data);
        }
    }, [data, token, setUserInfo]);

    return { refreshUserInfo: refetch, isFetching };
};
