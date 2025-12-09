/**
 * Type declarations for vite-plugin-uni-polyfill
 * @see https://github.com/dcloudio/vite-plugin-uni-polyfill
 */
declare module "vite-plugin-uni-polyfill" {
    import type { Plugin } from "vite";

    /**
     * UniApp polyfill plugin for Vite
     * @returns Vite plugin instance
     */
    function uniPolyfill(): Plugin;

    export default uniPolyfill;
}








