import type { ResponseSchema } from "@buildingai/types";

/**
 * Handle response data
 * @param responseData Original response data
 * @param returnFullResponse Whether to return full response
 * @returns Processed response data
 */
export function handleResponse<T>(
    responseData: ResponseSchema<T>,
    returnFullResponse = false,
): T | ResponseSchema<T> {
    return returnFullResponse ? responseData : (responseData.data as T);
}
