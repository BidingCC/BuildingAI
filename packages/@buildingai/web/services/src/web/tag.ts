import { useQuery } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export type Tag = {
    id: string;
    name: string;
    type: string;
    bindingCount?: number;
};

export type ListTagsParams = {
    type?: string;
    name?: string;
};

export async function listTags(params?: ListTagsParams): Promise<Tag[]> {
    const search = new URLSearchParams();
    if (params?.type) search.set("type", params.type);
    if (params?.name) search.set("name", params.name);
    const qs = search.toString();
    return apiHttpClient.get<Tag[]>(qs ? `/tag?${qs}` : "/tag");
}

export function useDatasetTags() {
    return useQuery({
        queryKey: ["tags", "dataset"],
        queryFn: () => listTags({ type: "dataset" }),
    });
}
