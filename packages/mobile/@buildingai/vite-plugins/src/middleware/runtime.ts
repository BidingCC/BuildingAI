import type { ComponentPublicInstance, Plugin } from "vue";

export interface Page extends ComponentPublicInstance {
    $mpType: string;
    $pages: Record<string, any>;
    $vm: Page;
    route: string;
}

export type MiddlewareReturn =
    | void
    | boolean
    | string
    | {
          url: string;
          method: "navigateTo" | "redirectTo" | "switchTab" | "reLaunch";
          options?: Record<string, any>;
      };

export type Middleware = (to: Page, from?: Page) => MiddlewareReturn | Promise<MiddlewareReturn>;

export interface MiddlewaresMap {
    global: Middleware[];
    [route: string]: Middleware[];
}

declare function getCurrentPages<T = Page>(): T[];
declare const uni: {
    navigateTo: (options: { url: string; [key: string]: any }) => void;
    redirectTo: (options: { url: string; [key: string]: any }) => void;
    switchTab: (options: { url: string; [key: string]: any }) => void;
    reLaunch: (options: { url: string; [key: string]: any }) => void;
    navigateBack: (options?: { delta?: number }) => void;
};

export function createNavigationGuard(middlewares: MiddlewaresMap): Plugin {
    let from: Page | undefined;
    let to: Page | undefined;

    return {
        install(app) {
            app.mixin({
                async onShow() {
                    const pages = getCurrentPages<Page>();
                    const page = pages[pages.length - 1];
                    if (!page || page.route === from?.route) return;

                    to = page;
                    try {
                        const pageMiddlewares = [
                            ...(middlewares.global || []),
                            ...(middlewares[to.route] || []),
                        ];

                        for (const middleware of pageMiddlewares) {
                            const result = await middleware(to, from);

                            if (result === undefined || result === true) continue;
                            if (result === false) {
                                pages.length >= 2
                                    ? uni.navigateBack()
                                    : from?.route && uni.reLaunch({ url: "/" + from.route });
                                return;
                            }
                            if (typeof result === "string") {
                                uni.redirectTo({ url: result });
                                return;
                            }
                            if (typeof result === "object") {
                                const { method, url, options = {} } = result;
                                uni[method]({ url, ...options });
                                return;
                            }
                        }
                    } catch (error) {
                        console.error("[uni-middleware] Error:", error);
                    }
                    from = to;
                },
            });
        },
    };
}

export function defineMiddleware(middleware: Middleware): Middleware {
    return middleware;
}
