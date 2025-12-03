declare module "virtual:uni-middleware" {
    import type { ComponentPublicInstance } from "vue";

    interface Page extends ComponentPublicInstance {
        $mpType: string;
        $pages: Record<string, any>;
        $vm: Page;
        route: string;
    }

    type MiddlewareReturn =
        | void
        | boolean
        | string
        | {
              url: string;
              method: "navigateTo" | "redirectTo" | "switchTab" | "reLaunch";
              options?: Record<string, any>;
          };

    type Middleware = (to: Page, from?: Page) => MiddlewareReturn | Promise<MiddlewareReturn>;

    interface MiddlewaresMap {
        global: Middleware[];
        [route: string]: Middleware[];
    }

    export const middlewares: MiddlewaresMap;
}
