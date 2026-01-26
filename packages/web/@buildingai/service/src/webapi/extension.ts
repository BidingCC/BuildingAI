import type { ExtensionFormData } from "../consoleapi/extensions";

/**
 * Get extension details
 * @description Retrieves detailed information for a specific extension
 * @param id Extension ID
 * @returns Promise with extension details
 */
export function apiGetWebExtensionDetailByIdentifier(
    identifier: string,
): Promise<ExtensionFormData> {
    console.log("apiGetWebExtensionDetailByIdentifier", identifier);

    return useWebGet(`/extension/detail/${identifier}`);
}
