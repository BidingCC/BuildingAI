import { defineMiddleware } from "@buildingai/vite-plugins/middleware";

export default defineMiddleware((to, from) => {
    console.log("[auth]", to.route, "from:", from?.route);
});
