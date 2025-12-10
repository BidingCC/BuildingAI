import type {
    ExtendedFetchOptions,
    ResponseSchema,
    UploadController,
    UploadOptions,
} from "@buildingai/types";

import { InterceptorManager } from "../core/interceptor-manager";
import { ErrorHandler } from "../handlers/error-handler";

/**
 * File upload handler
 * Responsible for handling file upload requests
 */
export class FileUpload {
    constructor(
        private getBaseURL: () => string,
        private interceptorManager: InterceptorManager,
        private errorHandler: ErrorHandler,
    ) {}

    /**
     * File upload
     * @param url Upload address
     * @param options Upload options
     * @returns Upload controller
     */
    upload<T = any>(url: string, options: UploadOptions): UploadController<T> {
        // Check runtime environment
        if (typeof window === "undefined" || !window.XMLHttpRequest) {
            throw new Error("File upload functionality requires browser environment");
        }

        // Destructure upload options
        const {
            file,
            fieldName = "file",
            formData = {},
            onProgress,
            headers = {},
            skipBusinessCheck = false,
            returnFullResponse = false,
        } = options;

        // Create progress variable and controller
        let progressValue = 0;
        let abortController: (() => void) | null = null;

        // Create upload Promise
        const uploadPromise = new Promise<T>((resolve, reject) => {
            // Create XHR object and FormData
            const xhr = new window.XMLHttpRequest();

            // Listen for upload progress
            xhr.upload.onprogress = (event: ProgressEvent) => {
                if (event.lengthComputable) {
                    progressValue = Math.round((event.loaded / event.total) * 100);
                    onProgress?.(progressValue);
                }
            };

            // Handle response
            xhr.onload = () => {
                try {
                    // Handle HTTP status code
                    if (xhr.status >= 200 && xhr.status < 300) {
                        // Parse response data
                        let responseData: ResponseSchema<T>;
                        try {
                            responseData = JSON.parse(xhr.responseText);
                        } catch {
                            // If parsing fails, return text content directly
                            resolve(xhr.responseText as T);
                            return;
                        }

                        // Handle business status code
                        try {
                            this.errorHandler.handle(xhr.status, responseData, skipBusinessCheck);

                            // Return full response or data only based on configuration
                            const result = returnFullResponse ? responseData : responseData.data;
                            resolve(result as T);
                        } catch (error) {
                            reject(error instanceof Error ? error : new Error(String(error)));
                        }
                    } else {
                        // Handle HTTP error status codes
                        try {
                            let responseData: ResponseSchema;
                            try {
                                responseData = JSON.parse(xhr.responseText);
                            } catch {
                                responseData = {
                                    code: xhr.status,
                                    data: null,
                                    message: xhr.statusText,
                                    timestamp: Date.now(),
                                };
                            }
                            this.errorHandler.handleHttpError(xhr.status, responseData);
                        } catch (error) {
                            reject(error instanceof Error ? error : new Error(String(error)));
                        }
                    }
                } catch (error) {
                    // Catch and handle other exceptions
                    reject(error instanceof Error ? error : new Error(String(error)));
                }
            };

            // Handle network errors
            xhr.onerror = () => {
                reject(new Error("Network error occurred during upload"));
            };

            // Handle request cancellation
            xhr.onabort = () => {
                reject(new Error("Upload was aborted"));
            };

            // 将 async 逻辑包装在立即执行的 async 函数中
            (async () => {
                try {
                    // Apply request interceptors to get header information
                    const processedConfig = await this.interceptorManager.runRequestInterceptors(
                        {
                            method: "POST",
                            headers: headers,
                        } as ExtendedFetchOptions,
                        false,
                    );

                    // Set cancel function
                    abortController = () => {
                        xhr.abort();
                        reject(new Error("Upload aborted"));
                    };

                    // Prepare form data
                    const form = file instanceof FormData ? file : new FormData();

                    // If passed in File object, add file and extra data
                    if (!(file instanceof FormData)) {
                        form.append(fieldName, file);
                        Object.entries(formData).forEach(([key, value]) => {
                            form.append(key, value);
                        });
                    }

                    // Initialize request
                    const baseURL = this.getBaseURL();
                    xhr.open("POST", baseURL ? `${baseURL}${url}` : url, true);

                    // Apply all request headers (interceptor set headers take priority, user custom headers override)
                    const mergedHeaders = {
                        ...(processedConfig.headers || {}),
                        ...headers,
                    };

                    // Set all headers
                    Object.entries(mergedHeaders).forEach(([key, value]) => {
                        if (value) xhr.setRequestHeader(key, String(value));
                    });

                    // Send request
                    xhr.send(form);
                } catch (error) {
                    reject(error);
                }
            })();
        });

        // Return controller
        return {
            abort: () => abortController?.(),
            progress: progressValue,
            promise: uploadPromise,
        };
    }
}
