// import { getUserInfo } from "@buildingai/services/shared";
// import { useAuthStore } from "@buildingai/stores";
// import { useCallback, useEffect, useRef } from "react";

// let isFetching = false;

// export const useRefreshUserInfo = () => {
//     const token = useAuthStore((s) => s.auth.token);
//     const userInfo = useAuthStore((s) => s.auth.userInfo);
//     const { setUserInfo } = useAuthStore((s) => s.authActions);

//     const lastTokenRef = useRef<string | undefined>(undefined);

//     const refreshUserInfo = useCallback(async () => {
//         if (!token) {
//             if (userInfo) setUserInfo(undefined);
//             return;
//         }

//         if (isFetching) return;

//         try {
//             isFetching = true;
//             const info = await getUserInfo();

//             setUserInfo(info);
//         } catch (error) {
//             console.error("Refresh UserInfo Error:", error);
//         } finally {
//             isFetching = false;
//         }
//     }, [token, !!userInfo, setUserInfo]);

//     useEffect(() => {
//         if (token !== lastTokenRef.current) {
//             refreshUserInfo();
//             lastTokenRef.current = token;
//         }
//     }, [token, refreshUserInfo]);

//     return { refreshUserInfo };
// };

import { getUserInfo } from "@buildingai/services/shared";
import { useAuthStore } from "@buildingai/stores";
import { useCallback, useEffect, useRef } from "react";

export const useRefreshUser = (manualOnly: boolean = false) => {
    const token = useAuthStore((state) => state.auth.token);
    const { setUserInfo } = useAuthStore((state) => state.authActions);

    const manualOnlyRef = useRef(manualOnly);
    manualOnlyRef.current = manualOnly;

    const refreshUserInfo = useCallback(async () => {
        const currentAuth = useAuthStore.getState().auth;
        const currentToken = currentAuth.token;
        const currentUserInfo = currentAuth.userInfo;

        if (!currentToken) {
            if (currentUserInfo) {
                console.log("User not logged in, clearing user info.");
                setUserInfo(undefined);
            }
            return;
        }

        try {
            const data = await getUserInfo();
            setUserInfo(data);
        } catch (error) {
            console.error("Failed to refresh user info:", error);
        }
    }, [setUserInfo]);

    useEffect(() => {
        if (manualOnlyRef.current) return;
        refreshUserInfo();
    }, [refreshUserInfo, token]);

    return { refreshUserInfo };
};
