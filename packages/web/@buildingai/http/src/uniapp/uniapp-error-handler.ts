/**
 * @fileoverview UniApp Error Handler
 * @description UniApp platform error handler using uni.showToast
 *
 * @author BuildingAI Teams
 */

import { BusinessCode } from "@buildingai/constants/shared/business-code.constant";
import type { ResponseSchema } from "@buildingai/types";

import type { ErrorHandler } from "../common/types";

/**
 * UniApp error handler
 * Uses uni.showToast for error display in UniApp environment
 */
export class UniAppErrorHandler implements ErrorHandler {
    /** Global custom business status code handler */
    private customCodeHandler: ((status: number, response: ResponseSchema) => void) | null = null;

    /**
     * Set custom status code handler
     * @param handler Status code handler function
     */
    setCustomCodeHandler(handler: (status: number, response: ResponseSchema) => void): void {
        this.customCodeHandler = handler;
    }

    /**
     * Show error message using uni.showToast
     * @param message Error message
     * @param _title Optional error title (not used in UniApp)
     */
    showError(message: string, _title?: string): void {
        try {
            // @ts-expect-error - uni is a global object in UniApp environment
            uni.showToast({
                title: message,
                icon: "none",
                duration: 2000,
            });
        } catch (_e) {
            // Fallback to console if uni.showToast is not available
            console.error("[UniAppErrorHandler]", message);
        }
    }

    /**
     * Handle login redirect using uni.reLaunch
     */
    handleLogin(): void {
        try {
            // @ts-expect-error - uni is a global object in UniApp environment
            uni.removeStorageSync("USER_TOKEN");
            // @ts-expect-error - uni is a global object in UniApp environment
            uni.reLaunch({ url: "/pages/login/index" });
        } catch (_e) {
            // Ignore navigation errors
        }
    }

    /**
     * Handle HTTP status code errors
     * @param status HTTP status code
     * @param responseData Response data
     */
    private handleHttpError(status: number, responseData: ResponseSchema): void {
        const response = responseData as ResponseSchema;
        const errorMessage = response?.message || "Unknown error";
        const errorPath = response?.path ? ` (${response.path})` : "";

        switch (status) {
            case 400:
                this.showError(`Bad Request: ${errorMessage}`);
                throw new Error(`Bad Request: ${errorMessage}${errorPath}`);

            case 401:
                // Unauthorized 401
                this.showError(`Unauthorized: ${errorMessage}`);
                this.handleLogin();
                throw new Error(`Unauthorized: ${errorMessage}`);

            case 403:
                this.showError(`Forbidden: ${errorMessage}`);
                throw new Error(`Forbidden: ${errorMessage}${errorPath}`);

            case 404:
                this.showError(`Not Found: ${errorMessage}${errorPath}`);
                throw new Error(`Not Found: ${status}: ${errorMessage}${errorPath}`);

            case 500:
                this.showError(`Internal Server Error: ${errorMessage}${errorPath}`);
                throw new Error(`Internal Server Error: ${errorMessage}${errorPath}`);

            default:
                this.showError(errorMessage + errorPath);
                throw new Error(`HTTP Error ${status}: ${errorMessage}${errorPath}`);
        }
    }

    /**
     * Handle business status code errors
     * @param code Business status code
     * @param response Response data
     */
    private handleBusinessError(code: number, response: ResponseSchema): void {
        // Success status code handling
        if (code === BusinessCode.SUCCESS) {
            return; // Business status code is normal, no need to handle
        }

        // Get error message
        let errorMessage = response?.message || `Unknown error, error code: ${code}`;
        const errorPath = response?.path ? ` (${response.path})` : "";

        // Match error message based on error code
        Object.entries(BusinessCode).forEach(([key, value]) => {
            if (value === code) {
                // Use the key as error message for better readability
                errorMessage = `Business Error: ${key} (${code})`;
            }
        });

        // Show error message
        this.showError(`${errorMessage}${errorPath}`);

        // Throw business error
        throw new Error(`${errorMessage}${errorPath}`);
    }

    /**
     * Handle complete error flow
     * @param status HTTP status code
     * @param response Response data
     * @param skipBusinessCheck Whether to skip business status code check
     */
    handle(status: number, response: ResponseSchema, skipBusinessCheck = false): void {
        // Handle HTTP status code
        if (status < 200 || status >= 300) {
            return this.handleHttpError(status, response);
        }

        // 1. Global custom business status code handling
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        this.customCodeHandler && this.customCodeHandler(response.code, response);

        // 2. System-level business status code handling
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        !skipBusinessCheck && this.handleBusinessError(response.code, response);
    }
}


