import { defineBuildingAIRouteMiddleware } from "@buildingai/nuxt/middleware";

export default defineBuildingAIRouteMiddleware({
    // handleMiddleware: async (to, from, userStore) => {
    handleMiddleware: async () => {
        console.log("handleMiddleware");
    },
});
