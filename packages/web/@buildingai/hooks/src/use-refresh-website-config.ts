import { getWebsiteConfig } from "@buildingai/services/shared";
import { useConfigStore } from "@buildingai/stores";
import { useCallback, useEffect, useRef } from "react";

export const useRefreshWebsiteConfig = (manualOnly: boolean = false) => {
    const { setWebsiteConfig } = useConfigStore((state) => state.configActions);

    const isFetchingRef = useRef(false);

    const refreshConfig = useCallback(async () => {
        if (isFetchingRef.current) return;

        isFetchingRef.current = true;
        try {
            const data = await getWebsiteConfig();
            setWebsiteConfig(data);
        } catch (error) {
            console.error("Failed to fetch website config:", error);
        } finally {
            isFetchingRef.current = false;
        }
    }, [setWebsiteConfig]);

    useEffect(() => {
        if (manualOnly) return;

        refreshConfig();
    }, [refreshConfig, manualOnly]);

    return { refreshConfig };
};
