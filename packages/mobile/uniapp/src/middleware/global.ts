import { defineMiddleware } from "@buildingai/vite-plugins/middleware";
import { getCurrentPageMeta } from "virtual:pages-meta";
import { pages } from "virtual:uni-pages";

import { useUserStore } from "@/stores/user";

export default defineMiddleware((to, from) => {
    const userStore = useUserStore();
    console.log("[global]", to, "from:", from);

    const requireAuth = getCurrentPageMeta()?.style?.auth !== false;
    if (requireAuth && !userStore.isLogin) {
        return {
            url: "/pages/login/index?redirect=" + to.route,
            method: "navigateTo",
        };
    }

    if (userStore.isLogin && to.route === "pages/login/index") {
        return {
            url: `/${pages[0]?.path || "/"}`,
            method: "reLaunch",
        };
    }

    return true;
});
