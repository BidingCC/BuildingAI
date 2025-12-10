import { defineMiddleware } from "@buildingai/vite-plugins/middleware";
import { getCurrentPageMeta } from "virtual:pages-meta";

export default defineMiddleware((to, from) => {
    console.log("[global]", to, "from:", from);

    const requireAuth = getCurrentPageMeta()?.style?.auth !== false;
    if (requireAuth) {
        return {
            url: "/pages/login/index",
            method: "redirectTo",
        };
    }
});
