export interface MiddlewarePluginOptions {
    middlewareDir?: string;
    pagesJsonPath?: string;
    programRoot?: string;
}

export interface ResolvedOptions {
    middlewareDir: string;
    pagesJsonPath: string;
    programRoot: string;
}

export interface MiddlewareInfo {
    path: string;
    name: string;
    value: string;
}

export const VIRTUAL_MODULE_ID = "virtual:uni-middleware";
export const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;
