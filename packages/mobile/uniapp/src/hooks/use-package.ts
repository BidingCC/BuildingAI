import { shallowRef } from "vue";

/**
 * Hook for dynamically loading async-components subpackage
 * @returns Object containing loading state
 *
 * @example
 * ```vue
 * <script setup>
 * const { isLoaded } = useAsyncPackage()
 * </script>
 *
 * <template>
 *   <view v-if="!isLoaded">Loading...</view>
 *   <BdPopover v-else />
 * </template>
 * ```
 */
export function useAsyncPackage(name: string = "async-components") {
    const isLoaded = shallowRef(false);

    // #ifdef MP
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require(`../async-components/${name}/index.js`, () => {
        setTimeout(() => {
            isLoaded.value = true;
        }, 500);
        console.log("loadSubpackage success", name);
    }, ({ mod, errMsg }) => {
        console.error(`path: ${mod}, ${errMsg}`);
    });
    // #endif

    // #ifndef MP
    isLoaded.value = true;
    // #endif

    return {
        /** Whether the subpackage has been loaded */
        isLoaded: isLoaded as Readonly<Ref<boolean>>,
    };
}
