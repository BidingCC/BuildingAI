export interface PagesMetaPluginOptions {
    pagesJsonPath?: string;
    /**
     * Type definition file path
     * If specified, the plugin will generate type definitions to this file
     * @example "src/types/pages-meta.d.ts"
     */
    dts?: string;
}

export interface PageMeta {
    path: string;
    style?: {
        navigationBarTitle?: string;
        navigationBarBackgroundColor?: string;
        navigationBarTextStyle?: string;
        [key: string]: any;
    };
    [key: string]: any;
}

export interface PagesMetaMap {
    [path: string]: PageMeta;
}

export const VIRTUAL_MODULE_ID = "virtual:pages-meta";
export const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;

