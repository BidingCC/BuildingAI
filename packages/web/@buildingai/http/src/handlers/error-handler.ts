import { BusinessCode } from "@buildingai/constants/shared/business-code.constant";
import { useUserStore } from "@buildingai/stores/user";
import type { ResponseSchema } from "@buildingai/types";
import type { Composer } from "vue-i18n";

/**
 * Error handler
 * Responsible for handling HTTP status code errors and business error codes
 */
export class ErrorHandler {
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
     * Handle HTTP status code errors
     * @param status HTTP status code
     * @param responseData Response data
     */
    handleHttpError(status: number, responseData: ResponseSchema): void {
        const response = responseData as ResponseSchema;
        const errorMessage = response?.message || "Unknown error";
        const errorPath = response?.path ? ` (${response.path})` : "";

        const { $i18n } = useNuxtApp();
        const t = ($i18n as Composer).t;

        switch (status) {
            case 400:
                useMessage().error(`Bad Request: ${errorMessage}`, {
                    title: t("common.request.400"),
                });
                throw new Error(`Bad Request: ${errorMessage}${errorPath}`);

            case 401:
                // Unauthorized 401
                useMessage().error(`Unauthorized: ${errorMessage}`, {
                    title: t("common.request.401"),
                });
                useUserStore().toLogin();
                throw new Error(`Unauthorized: ${errorMessage}`);

            case 403:
                useMessage().error(`Forbidden: ${errorMessage}`, {
                    title: t("common.request.403"),
                });
                throw new Error(`Forbidden: ${errorMessage}${errorPath}`);

            case 404:
                useMessage().error(`Not Found: ${errorMessage}${errorPath}`, {
                    title: t("common.request.404"),
                });
                throw new Error(`Not Found: ${status}: ${errorMessage}${errorPath}`);

            case 500:
                useMessage().error(`Internal Server Error: ${errorMessage}${errorPath}`, {
                    title: t("common.request.500"),
                });
                throw new Error(`Internal Server Error: ${errorMessage}${errorPath}`);

            default:
                useMessage().error(errorMessage + errorPath);
                throw new Error(`HTTP Error ${status}: ${errorMessage}${errorPath}`);
        }
    }

    /**
     * Handle business status code errors
     * @param code Business status code
     * @param response Response data
     */
    handleBusinessError(code: number, response: ResponseSchema): void {
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
