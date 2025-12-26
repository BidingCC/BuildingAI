import { defineMiddleware } from "@buildingai/vite-plugins/middleware";
import { getCurrentPageMeta } from "virtual:pages-meta";
import { pages } from "virtual:uni-pages";

import { useUserStore } from "@/stores/user";

export default defineMiddleware((to, from) => {
    const userStore = useUserStore();
    console.log("[global]", to, "from:", from);

    const requireAuth = getCurrentPageMeta()?.style?.auth !== false;
    const currentRoute = getCurrentPageMeta()?.path;

    console.log(
        "requireAuth",
        requireAuth,
        "userStore.isLogin",
        userStore.isLogin,
        "currentRoute",
        currentRoute,
    );
    if (requireAuth && !userStore.isLogin && currentRoute !== "packages/login/index") {
        return {
            url: "/packages/login/index?redirect=" + to.route,
            method: "navigateTo",
        };
    }

    if (userStore.isLogin && to.route === "packages/login/index") {
        return {
            url: `/${pages[0]?.path || "/"}`,
            method: "reLaunch",
        };
    }

    return true;
});
