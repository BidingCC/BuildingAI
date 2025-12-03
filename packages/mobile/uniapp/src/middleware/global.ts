import { defineMiddleware } from "@buildingai/vite-plugins/middleware";

export default defineMiddleware((to, from) => {
    console.log("[global]", to.route, "from:", from?.route);
});
