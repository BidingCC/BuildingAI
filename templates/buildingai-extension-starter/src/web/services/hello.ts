export function apiGetHello(): Promise<{ message: string }> {
    return usePluginWebGet<{ message: string }>("/hello");
}
