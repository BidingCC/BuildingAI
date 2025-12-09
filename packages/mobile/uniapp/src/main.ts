import "virtual:uno.css";

import { createNavigationGuard } from "@buildingai/vite-plugins/middleware";
import { createPinia } from "pinia";
import { middlewares } from "virtual:uni-middleware";
import type { Plugin } from "vue";
import { createSSRApp } from "vue";

import App from "./App.vue";
import i18n from "./i18n";

export function createApp() {
    const app = createSSRApp(App);
    const pinia = createPinia();
    app.use(pinia);
    app.use(i18n);
    app.use(createNavigationGuard(middlewares) as unknown as Plugin);
    return {
        app,
    };
}
