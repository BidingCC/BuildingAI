import type { AxiosRequestConfig } from "axios";

import type { Query } from "../core/types";

export interface RequestConfig extends AxiosRequestConfig {
    query?: Query;
    requestId?: string;
    /** AbortSignal for cancellation */
    signal?: AbortSignal;
}

export function withQuery(url: string, query?: Query): string {
    if (!query) return url;

    const u = new URL(url, "http://local");

    for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        u.searchParams.set(k, String(v));
    }

    const path = u.pathname + (u.search ? u.search : "");

    if (url.startsWith("http://") || url.startsWith("https://")) {
        return u.toString();
    }

    return path;
}

export function mergeRequestConfig(
    base: AxiosRequestConfig,
    extra: RequestConfig,
): AxiosRequestConfig {
    const url = extra.url ? withQuery(extra.url, extra.query) : base.url;

    return {
        ...base,
        ...extra,
        url,
    };
}
