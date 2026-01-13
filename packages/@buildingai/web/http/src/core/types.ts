export type AnyRecord = Record<string, any>;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface HttpMeta {
    requestId?: string;
    fromCache?: boolean;
}

export interface ApiSuccess<TData = unknown, TMeta extends HttpMeta = HttpMeta> {
    ok: true;
    data: TData;
    meta?: TMeta;
}

export interface ApiFailure<TMeta extends HttpMeta = HttpMeta> {
    ok: false;
    error: HttpError;
    meta?: TMeta;
}

export type ApiResult<TData = unknown, TMeta extends HttpMeta = HttpMeta> =
    | ApiSuccess<TData, TMeta>
    | ApiFailure<TMeta>;

export type Query = Record<string, string | number | boolean | null | undefined>;

export type HeaderValue = string | number | boolean | null | undefined;

export type HeadersInput = Record<string, HeaderValue>;

export interface HttpErrorShape {
    name: string;
    message: string;
    code?: string;
    status?: number;
    details?: unknown;
    cause?: unknown;
}

export class HttpError extends Error {
    public readonly code?: string;
    public readonly status?: number;
    public readonly details?: unknown;
    public readonly cause?: unknown;

    public constructor(shape: HttpErrorShape) {
        super(shape.message);
        this.name = shape.name;
        this.code = shape.code;
        this.status = shape.status;
        this.details = shape.details;
        this.cause = shape.cause;
    }
}

export interface RetryOptions {
    retries: number;
    /** base delay in ms */
    delay: number;
    /** exponential factor */
    factor?: number;
    /** status codes to retry */
    retryOnStatuses?: number[];
    /** methods to retry */
    retryOnMethods?: HttpMethod[];
}

export interface HttpHooks {
    getAccessToken?: () => string | undefined | Promise<string | undefined>;
    onAuthError?: (error: unknown) => void | Promise<void>;
    /**
     * Called when request received 401 and you want to refresh token.
     * Return true to indicate refresh succeeded and request should be retried.
     */
    refreshAccessToken?: () => boolean | Promise<boolean>;
}

export interface HttpClientOptions {
    baseURL?: string;
    /**
     * Prefix inserted between `baseURL` and request `url`.
     * Example: baseURL='/api', pathPrefix='/v1', url='/auth/login' => '/api/v1/auth/login'
     */
    pathPrefix?: string;
    timeoutMs?: number;
    headers?: HeadersInput;
    withCredentials?: boolean;
    /**
     * Interpret business response shape.
     * If provided, client will map response into ApiResult.
     */
    parseResponse?: <T>(raw: unknown) => ApiResult<T>;
    retry?: Partial<RetryOptions>;
    hooks?: HttpHooks;
}
