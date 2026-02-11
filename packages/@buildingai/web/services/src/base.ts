import { createHttpClient, createStandardApiParser, type HttpError } from "@buildingai/http";
import { useAuthStore } from "@buildingai/stores";
import { toast } from "sonner";

const isDev = import.meta.env.DEV;
const devBase = import.meta.env.VITE_DEVELOP_APP_BASE_URL;
const prodBase = import.meta.env.VITE_PRODUCTION_APP_BASE_URL;

function handleHttpError(error: HttpError): void {
    const message = error.message || "请求失败";
    toast.error(message);
}

export const apiHttpClient = createHttpClient({
    baseURL: isDev ? devBase : prodBase,
    pathPrefix: import.meta.env.VITE_APP_WEB_API_PREFIX || "/api",
    parseResponse: createStandardApiParser(),
    hooks: {
        getAccessToken: async () => {
            return useAuthStore.getState().auth.token || "";
        },
        onAuthError: async () => {
            return useAuthStore.getState().authActions.logout();
        },
        onError: handleHttpError,
    },
});

export const consoleHttpClient = createHttpClient({
    baseURL: isDev ? devBase : prodBase,
    pathPrefix: import.meta.env.VITE_APP_CONSOLE_API_PREFIX || "/console",
    parseResponse: createStandardApiParser(),
    hooks: {
        getAccessToken: async () => {
            return useAuthStore.getState().auth.token || "";
        },
        onAuthError: async () => {
            return useAuthStore.getState().authActions.logout();
        },
        onError: handleHttpError,
    },
});
