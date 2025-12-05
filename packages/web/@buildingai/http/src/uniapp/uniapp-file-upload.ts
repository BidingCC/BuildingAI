/**
 * @fileoverview UniApp File Upload Handler
 * @description UniApp platform file upload using uni.uploadFile
 *
 * @author BuildingAI Teams
 */

import type {
    ExtendedFetchOptions,
    ResponseSchema,
    UploadController,
    UploadOptions,
} from "@buildingai/types";

import { InterceptorManager } from "../common/interceptor-manager";
import type { ErrorHandler } from "../common/types";

/**
 * UniApp File upload handler
 * Uses uni.uploadFile for file upload requests
 */
export class UniAppFileUpload {
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
        // @ts-expect-error - UniApp uploadTask type
        let uploadTask: any = null;

        // Create upload Promise
        const uploadPromise = new Promise<T>((resolve, reject) => {
            // Wrap async logic in immediately executed async function
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

                    // Build full URL
                    const baseURL = this.getBaseURL();
                    const fullUrl = baseURL ? `${baseURL}${url}` : url;

                    // Merge headers
                    const mergedHeaders = {
                        ...(processedConfig.headers || {}),
                        ...headers,
                    };

                    // Determine file path
                    let filePath: string = "";
                    if (typeof file === "string") {
                        // If file is a string, assume it's a file path
                        filePath = file;
                    } else if (file && typeof file === "object" && "path" in file) {
                        // If file is an object with path property
                        filePath = (file as any).path;
                    } else if (file && typeof file === "object" && "tempFilePath" in file) {
                        // If file is from uni.chooseImage result
                        filePath = (file as any).tempFilePath;
                    }

                    if (!filePath) {
                        reject(new Error("Invalid file: must be a file path string or object with path/tempFilePath property"));
                        return;
                    }

                    // @ts-expect-error - uni is a global object in UniApp environment
                    uploadTask = uni.uploadFile({
                        url: fullUrl,
                        filePath: filePath,
                        name: fieldName,
                        formData: formData,
                        header: mergedHeaders,
                        success: (res: any) => {
                            try {
                                // Handle HTTP status code
                                if (res.statusCode >= 200 && res.statusCode < 300) {
                                    // Parse response data
                                    let responseData: ResponseSchema<T>;
                                    try {
                                        responseData = typeof res.data === "string"
                                            ? JSON.parse(res.data)
                                            : res.data;
                                    } catch {
                                        // If parsing fails, return text content directly
                                        resolve(res.data as T);
                                        return;
                                    }

                                    // Handle business status code
                                    try {
                                        this.errorHandler.handle(res.statusCode, responseData, skipBusinessCheck);

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
                                            responseData = typeof res.data === "string"
                                                ? JSON.parse(res.data)
                                                : res.data;
                                        } catch {
                                            responseData = {
                                                code: res.statusCode,
                                                data: null,
                                                message: "Upload failed",
                                                timestamp: Date.now(),
                                            };
                                        }
                                        this.errorHandler.handle(res.statusCode, responseData, false);
                                    } catch (error) {
                                        reject(error instanceof Error ? error : new Error(String(error)));
                                    }
                                }
                            } catch (error) {
                                reject(error instanceof Error ? error : new Error(String(error)));
                            }
                        },
                        fail: (err: any) => {
                            reject(new Error(err.errMsg || "Upload failed"));
                        },
                    });

                    // Listen for upload progress
                    if (uploadTask && typeof uploadTask.onProgressUpdate === "function") {
                        uploadTask.onProgressUpdate((res: any) => {
                            progressValue = res.progress;
                            onProgress?.(progressValue);
                        });
                    }
                } catch (error) {
                    reject(error);
                }
            })();
        });

        // Return controller
        return {
            abort: () => {
                if (uploadTask && typeof uploadTask.abort === "function") {
                    uploadTask.abort();
                }
            },
            progress: progressValue,
            promise: uploadPromise,
        };
    }
}

