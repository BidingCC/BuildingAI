declare module "virtual:pages-meta" {
    interface PageStyle {
        navigationBarTitleText?: string;
        navigationBarBackgroundColor?: string;
        navigationBarTextStyle?: string;
        [key: string]: unknown;
    }

    interface PageMeta {
        path: string;
        style?: PageStyle;
        [key: string]: unknown;
    }

    interface PagesMetaMap {
        [path: string]: PageMeta;
    }

    interface TabBarItem {
        pagePath: string;
        index: number;
        [key: string]: unknown;
    }

    export const pagesMeta: PagesMetaMap;
    export const tabBarList: TabBarItem[];
    export function getPageMeta(path: string): PageMeta | null;
    export function getPageTitle(path: string): string;
    export function getCurrentPageMeta(): PageMeta | null;
    export function getCurrentPageTitle(): string;
}
