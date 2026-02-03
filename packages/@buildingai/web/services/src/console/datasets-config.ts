import type { RetrievalConfig } from "@buildingai/types/ai/retrieval-config.interface";
import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type DatasetsConfigDto = {
    initialStorageMb: number;
    embeddingModelId: string;
    textModelId: string;
    defaultRetrievalConfig: RetrievalConfig;
};

export type UpdateDatasetsConfigDto = {
    initialStorageMb?: number;
    embeddingModelId?: string;
    textModelId?: string;
    defaultRetrievalConfig?: Partial<RetrievalConfig>;
};

export function useDatasetsConfigQuery(options?: QueryOptionsUtil<DatasetsConfigDto>) {
    return useQuery<DatasetsConfigDto>({
        queryKey: ["datasets-config"],
        queryFn: () => consoleHttpClient.get<DatasetsConfigDto>("/datasets-config"),
        ...options,
    });
}

export function useSetDatasetsConfigMutation(
    options?: MutationOptionsUtil<DatasetsConfigDto, UpdateDatasetsConfigDto>,
) {
    return useMutation<DatasetsConfigDto, Error, UpdateDatasetsConfigDto>({
        mutationFn: (dto) => consoleHttpClient.post<DatasetsConfigDto>("/datasets-config", dto),
        ...options,
    });
}
