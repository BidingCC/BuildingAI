import type {
    ChatStreamConfig,
    HttpClient,
    HttpClientOptions,
    HttpMethod,
    RequestOptions,
    ResponseSchema,
    UploadController,
    UploadOptions,
} from "@buildingai/types";

import { ChatStream } from "../features/chat-stream";
import { FileUpload } from "../features/file-upload";
import { ErrorHandler } from "../handlers/error-handler";
import { ParamsProcessor } from "../utils/params-processor";
import { RequestCache } from "../utils/request-cache";
import { InterceptorManager } from "./interceptor-manager";
import { RequestExecutor } from "./request-executor";

/**
 * HTTP client implementation class
 * Integrates all modules to provide complete HTTP client functionality
 */
export class HttpClientImpl implements HttpClient {
    private requestCache: RequestCache;
    private paramsProcessor: ParamsProcessor;
    private interceptorManager: InterceptorManager;
    private errorHandler: ErrorHandler;
    private requestExecutor: RequestExecutor;
    private chatStreamHandler: ChatStream;
    private fileUploadHandler: FileUpload;

    // Client configuration
    private clientConfig: HttpClientOptions;

    constructor(config: HttpClientOptions = {}) {
        // Initialize configuration
        this.clientConfig = {
            baseURL: "",
            timeout: 30000,
            dedupe: true,
            ignoreResponseError: false,
            ...config,
        };

        // Initialize each module
        this.requestCache = new RequestCache();
        this.paramsProcessor = new ParamsProcessor();
        this.interceptorManager = new InterceptorManager();
        this.errorHandler = new ErrorHandler();

        // Initialize request executor
        this.requestExecutor = new RequestExecutor(
            () => this.clientConfig.baseURL || "",
            () => this.clientConfig.timeout || 30000,
            this.requestCache,
            this.paramsProcessor,
            this.interceptorManager,
            this.errorHandler,
        );

        // Initialize feature modules
        this.chatStreamHandler = new ChatStream(
            () => this.clientConfig.baseURL || "",
            this.interceptorManager,
        );

        this.fileUploadHandler = new FileUpload(
            () => this.clientConfig.baseURL || "",
            this.interceptorManager,
            this.errorHandler,
        );
    }

    /** ==================== HTTP Request Methods ==================== */

    /**
     * Send GET request
     */
    get<T>(url: string, options?: RequestOptions): Promise<T> {
        return this.requestExecutor.execute<T>("GET", url, options);
    }

    /**
     * Send POST request
     */
    post<T>(url: string, options?: RequestOptions): Promise<T> {
        return this.requestExecutor.execute<T>("POST", url, options);
    }

    /**
     * Send PUT request
     */
    put<T>(url: string, options?: RequestOptions): Promise<T> {
        return this.requestExecutor.execute<T>("PUT", url, options);
    }

    /**
     * Send DELETE request
     */
    delete<T>(url: string, options?: RequestOptions): Promise<T> {
        return this.requestExecutor.execute<T>("DELETE", url, options);
    }

    /**
     * Send PATCH request
     */
    patch<T>(url: string, options?: RequestOptions): Promise<T> {
        return this.requestExecutor.execute<T>("PATCH", url, options);
    }

    /**
     * Send custom request
     */
    request<T>(method: HttpMethod, url: string, options?: RequestOptions): Promise<T> {
        return this.requestExecutor.execute<T>(method, url, options);
    }

    /** ==================== Special Features ==================== */

    /**
     * Establish chat stream connection
     */
    chatStream(url: string, config: ChatStreamConfig): Promise<{ abort: () => void }> {
        return this.chatStreamHandler.create(url, config);
    }

    /**
     * File upload
     */
    upload<T = any>(url: string, options: UploadOptions): UploadController<T> {
        return this.fileUploadHandler.upload<T>(url, options);
    }

    /** ==================== Request Control ==================== */

    /**
     * Cancel specific request
     */
    cancel(url: string, method: HttpMethod = "GET"): void {
        this.requestCache.cancel(url, method);
    }

    /**
     * Cancel all requests
     */
    cancelAll(): void {
        this.requestCache.cancelAll();
    }

    /** ==================== Interceptors ==================== */

    /**
     * Interceptor manager
     */
    get interceptors() {
        return this.interceptorManager;
    }

    /** ==================== Configuration Methods ==================== */

    /**
     * Set global request headers
     */
    setHeader(name: string, value: string): HttpClient {
        if (!this.clientConfig.fetchOptions) {
            this.clientConfig.fetchOptions = {};
        }

        if (!this.clientConfig.fetchOptions.headers) {
            this.clientConfig.fetchOptions.headers = {};
        }

        (this.clientConfig.fetchOptions.headers as Record<string, string>)[name] = value;

        return this;
    }

    /**
     * Set authentication token
     */
    setToken(token: string, type = "Bearer"): HttpClient {
        return this.setHeader("Authorization", `${type} ${token}`);
    }

    /**
     * Set base URL
     */
    setBaseURL(baseURL: string): HttpClient {
        this.clientConfig.baseURL = baseURL;
        return this;
    }

    /**
     * Set timeout duration
     */
    setTimeout(timeout: number): HttpClient {
        this.clientConfig.timeout = timeout;
        return this;
    }

    /**
     * Set global custom business status code handler
     */
    setStatusHandler(handler: (status: number, response: ResponseSchema) => void): HttpClient {
        this.errorHandler.setCustomCodeHandler(handler);
        return this;
    }

    /**
     * Set parameter processor
     */
    setParamsProcessor(
        processor: (params: Record<string, unknown>) => Record<string, unknown>,
    ): HttpClient {
        this.paramsProcessor.setProcessor(processor);
        return this;
    }
}
