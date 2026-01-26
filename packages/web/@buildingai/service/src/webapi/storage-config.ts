import type { StorageConfigTableData } from "../consoleapi/storage-config";

export function apiGetActiveStorage(): Promise<StorageConfigTableData> {
    return useWebGet("/storage-config/active");
}
