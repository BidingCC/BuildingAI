import type { QueryOptionsUtil } from "@buildingai/web-types";
import { useQuery } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export type AgreementConfig = {
    serviceTitle?: string;
    serviceContent?: string;
    privacyTitle?: string;
    privacyContent?: string;
};

export type AgreementConfigResponse = {
    agreement: AgreementConfig;
};

export function useAgreementConfigQuery(options?: QueryOptionsUtil<AgreementConfigResponse>) {
    return useQuery<AgreementConfigResponse>({
        queryKey: ["config", "agreement"],
        queryFn: () => apiHttpClient.get<AgreementConfigResponse>("/config/agreement"),
        ...options,
    });
}

export type DatasetsSquarePublishConfig = {
    squarePublishSkipReview: boolean;
};

export function useDatasetsSquarePublishConfigQuery(
    options?: QueryOptionsUtil<DatasetsSquarePublishConfig>,
) {
    return useQuery<DatasetsSquarePublishConfig>({
        queryKey: ["config", "datasets"],
        queryFn: () => apiHttpClient.get<DatasetsSquarePublishConfig>("/config/datasets"),
        ...options,
    });
}
