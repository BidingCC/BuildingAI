export interface MiddlewarePluginOptions {
    middlewareDir?: string;
    pagesJsonPath?: string;
    programRoot?: string;
    /**
     * Type definition file path
     * If specified, the plugin will generate type definitions to this file
     * @example "src/types/middleware.d.ts"
     */
    dts?: string;
}

export interface ResolvedOptions {
    middlewareDir: string;
    pagesJsonPath: string;
    programRoot: string;
    dts?: string;
}

export interface MiddlewareInfo {
    path: string;
    name: string;
    value: string;
}

export const VIRTUAL_MODULE_ID = "virtual:uni-middleware";
export const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;
