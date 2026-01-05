import { useWebsiteConfigQuery } from "@buildingai/services/shared";
import { useConfigStore } from "@buildingai/stores";
import { useEffect } from "react";

export const useRefreshWebsiteConfig = (manualOnly: boolean = false) => {
    const { setWebsiteConfig } = useConfigStore((state) => state.configActions);

    const { data, refetch, isFetching } = useWebsiteConfigQuery({
        enabled: !manualOnly,
    });

    useEffect(() => {
        if (data) setWebsiteConfig(data);
    }, [data, setWebsiteConfig]);

    return { refreshConfig: refetch, isFetching };
};
