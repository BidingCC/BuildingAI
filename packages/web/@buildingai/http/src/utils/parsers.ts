import type { ApiResult } from "../core/types";
import { HttpError } from "../core/types";

export interface StandardApiEnvelope<T = unknown> {
    code: number;
    message: string;
    data: T;
    timestamp: number;
}

export interface StandardApiOptions {
    /**
     * When true, validate standard envelope and treat non-2xxxx as failure.
     * When false, always treat as success.
     */
    strict?: boolean;
}

export function createStandardApiParser(options: StandardApiOptions = {}) {
    const strict = options.strict ?? true;

    return function parse<T>(raw: unknown): ApiResult<T> {
        const payload = raw as Partial<StandardApiEnvelope<T>> | null | undefined;

        if (!strict) {
            return { ok: true, data: raw as T };
        }

        if (!payload || typeof payload !== "object") {
            return {
                ok: false,
                error: new HttpError({
                    name: "HttpParseError",
                    message: "Invalid response payload",
                    details: raw,
                }),
            };
        }

        if (typeof payload.code !== "number") {
            return {
                ok: false,
                error: new HttpError({
                    name: "HttpParseError",
                    message: "Missing response code",
                    details: raw,
                }),
            };
        }

        const code = payload.code;
        const isOk = code >= 20000 && code < 30000;

        if (!isOk) {
            return {
                ok: false,
                error: new HttpError({
                    name: "HttpBusinessError",
                    message: String(payload.message ?? "Business error"),
                    code: String(code),
                    details: raw,
                }),
            };
        }

        return { ok: true, data: (payload.data as T) ?? (undefined as T) };
    };
}
