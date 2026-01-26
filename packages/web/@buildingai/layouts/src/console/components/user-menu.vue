<script lang="ts" setup>
import { STORAGE_KEYS } from "@buildingai/constants/web";
import { getTranslationName, type LanguageCode, languageOptions } from "@buildingai/i18n-config";
import {
    colorList,
    colorListMap,
    neutralColorList,
    neutralColorMap,
} from "@buildingai/web-config/theme";
import { useColorMode } from "@vueuse/core";

import type { DropdownMenuItem } from "#ui/types";

const SystemInfoModal = defineAsyncComponent(() => import("./system-info-modal.vue"));

const props = defineProps<{
    /** 显示模式：'sidebar' 或 'mixture' */
    mode: "sidebar" | "mixture";
    /** 是否折叠（仅在sidebar模式下有效） */
    collapsed?: boolean;
    /** 是否为移动菜单（仅在sidebar模式下有效）*/
    mobileMenu?: boolean;
}>();

const emits = defineEmits<{
    /** 更新折叠状态 */
    (e: "update:collapsed", v: boolean): void;
}>();

// 仅在sidebar模式下使用
const value = props.mode === "sidebar" ? useVModel(props, "collapsed", emits) : ref(false);

const controlsStore = useControlsStore();
const { store } = useColorMode();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const appConfig = useAppConfig() as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { locale, t, setLocale } = useI18n() as any;
const { smartNavigate } = useSmartNavigate();
const userStore = useUserStore();

const languageCookie = useCookie<LanguageCode>("nuxt-ui-language");
const open = shallowRef<boolean>(false);
const overlay = useOverlay();

const openSystemInfo = async () => {
    const modal = overlay.create(SystemInfoModal);
    await modal.open();
};

const currentThemeMode = computed(() => {
    if (store.value === "auto")
        return {
            label: t("layouts.theme.system"),
            icon: "i-heroicons-computer-desktop-20-solid",
        };
    return store.value === "light"
        ? { label: t("layouts.theme.light"), icon: "i-lucide-sun" }
        : { label: t("layouts.theme.dark"), icon: "i-lucide-moon" };
});

const menuItems = computed<DropdownMenuItem[][]>(() => [
    [
        {
            label: "profile",
        },
    ],
    [
        {
            label:
                controlsStore.consoleLayoutMode === "side"
                    ? t("layouts.sidebar")
                    : t("layouts.mixture"),
            icon:
                controlsStore.consoleLayoutMode === "side"
                    ? "i-lucide-panel-left"
                    : "i-lucide-panels-top-left",
            children: [
                {
                    label: t("layouts.sidebar"),
                    icon: "i-lucide-panel-left",
                    type: "checkbox",
                    checked: controlsStore.consoleLayoutMode === "side",
                    onSelect(e: MouseEvent) {
                        e.preventDefault();
                        controlsStore.consoleLayoutMode = "side";
                        useCookie(STORAGE_KEYS.LAYOUT_MODE).value = "side";
                    },
                },
                {
                    label: t("layouts.mixture"),
                    icon: "i-lucide-panels-top-left",
                    type: "checkbox",
                    checked: controlsStore.consoleLayoutMode === "mixture",
                    onUpdateChecked(checked: boolean) {
                        if (checked) {
                            controlsStore.consoleLayoutMode = "mixture";
                            useCookie(STORAGE_KEYS.LAYOUT_MODE).value = "mixture";
                        }
                    },
                    onSelect(e: Event) {
                        e.preventDefault();
                    },
                },
            ],
        },
        {
            label: t("layouts.theme.theme"),
            icon: "i-lucide-palette",
            children: [
                {
                    label: t("layouts.theme.color"),
                    slot: "chip",
                    chip: appConfig.ui.colors.primary,
                    content: {
                        align: "center",
                        collisionPadding: 16,
                    },
                    children: colorList.map((color) => ({
                        label: t(colorListMap[color]),
                        chip: color,
                        slot: "chip",
                        checked: appConfig.ui.colors.primary === color,
                        type: "checkbox",
                        onSelect: (e: MouseEvent) => {
                            e.preventDefault();
                            const blackAsPrimary = useCookie<boolean>(
                                STORAGE_KEYS.NUXT_UI_BLACK_AS_PRIMARY,
                            );
                            const primary = useCookie(STORAGE_KEYS.NUXT_UI_PRIMARY);
                            primary.value = color;
                            appConfig.ui.colors.primary = color;
                            if (color === "black") {
                                appConfig.theme.blackAsPrimary = true;
                                blackAsPrimary.value = true;
                                appConfig.ui.colors.primary = color;
                                return;
                            }
                            appConfig.theme.blackAsPrimary = false;
                            blackAsPrimary.value = false;
                        },
                    })),
                },
                {
                    label: t("layouts.theme.neutralLabel"),
                    slot: "chip",
                    chip: appConfig.ui.colors.neutral,
                    content: {
                        align: "end",
                        collisionPadding: 16,
                    },
                    children: neutralColorList.map((color) => ({
                        label: t(neutralColorMap[color]),
                        chip: color,
                        slot: "chip",
                        type: "checkbox",
                        checked: appConfig.ui.colors.neutral === color,
                        onSelect: (e: MouseEvent) => {
                            e.preventDefault();
                            const neutral = useCookie(STORAGE_KEYS.NUXT_UI_NEUTRAL);
                            neutral.value = color;
                            appConfig.ui.colors.neutral = color;
                        },
                    })),
                },
            ],
        },
        {
            label: currentThemeMode.value.label,
            icon: currentThemeMode.value.icon,
            children: [
                {
                    label: t("layouts.theme.system"),
                    icon: "i-heroicons-computer-desktop-20-solid",
                    type: "checkbox",
                    checked: store.value === "auto",
                    onSelect(e: MouseEvent) {
                        e.preventDefault();
                        store.value = "auto";
                    },
                },
                {
                    label: t("layouts.theme.light"),
                    icon: "i-lucide-sun",
                    type: "checkbox",
                    checked: store.value === "light",
                    onSelect(e: MouseEvent) {
                        e.preventDefault();
                        store.value = "light";
                    },
                },
                {
                    label: t("layouts.theme.dark"),
                    icon: "i-lucide-moon",
                    type: "checkbox",
                    checked: store.value === "dark",
                    onUpdateChecked(checked: boolean) {
                        if (checked) {
                            store.value = "dark";
                        }
                    },
                    onSelect(e: Event) {
                        e.preventDefault();
                    },
                },
            ],
        },
        {
            label: getTranslationName(locale.value as LanguageCode),
            icon: "i-lucide-languages",
            content: {
                align: "end",
                collisionPadding: 16,
            },
            children: languageOptions.map((lang) => ({
                label: `${lang.name}`,
                // icon: lang.icon,
                type: "checkbox",
                slot: "lang",
                checked: locale.value === lang.code,
                onSelect(e: MouseEvent) {
                    e.preventDefault();
                    setLocale(lang.code as LanguageCode);
                    languageCookie.value = lang.code;
                },
            })),
        },
    ],
    [
        {
            label: t("layouts.systemInfo.title"),
            icon: "i-tabler-info-circle",
            onSelect(e: MouseEvent) {
                e.preventDefault();
                void openSystemInfo();
            },
        },
        {
            label: t("layouts.officeLink"),
            icon: "i-lucide-external-link",
            onSelect() {
                window.open("https://www.buildingai.cc", "_blank");
            },
        },
    ],
    [
        {
            label: t("layouts.logout"),
            icon: "i-lucide-log-out",
            onSelect(e: MouseEvent) {
                e.preventDefault();
                userStore.logout();
            },
        },
    ],
]);

defineShortcuts({
    o: () => (open.value = !open.value),
});
</script>

<template>
    <!-- Sidebar模式的容器 -->
    <div class="flex flex-col gap-1" :class="collapsed ? 'px-1' : 'px-1.5'">
        <div
            v-if="controlsStore.consoleLayoutMode === 'side'"
            class="hover:bg-secondary dark:hover:bg-surface-800 flex cursor-pointer flex-col rounded-lg select-none"
        >
            <div class="flex h-10 items-center justify-between px-3 py-2 text-sm font-medium">
                <a
                    class="flex items-center gap-1.5"
                    href="https://www.buildingai.cc"
                    target="_blank"
                >
                    <Icon name="i-lucide-external-link" />
                    <span v-if="!collapsed" class="truncate">{{ t("layouts.officeLink") }}</span>
                </a>
            </div>
        </div>

        <div
            class="hover:bg-secondary dark:hover:bg-surface-800 flex cursor-pointer flex-col rounded-lg px-3 py-2 select-none"
            :class="{ 'bg-secondary dark:bg-surface-800': open }"
        >
            <UDropdownMenu
                v-model:open="open"
                :items="menuItems"
                :content="
                    mode === 'mixture'
                        ? { sideOffset: 4, collisionPadding: 14 }
                        : {
                              align: 'start',
                              side: mobileMenu ? 'top' : 'right',
                              sideOffset: 10,
                              collisionPadding: 10,
                          }
                "
                :ui="{
                    content:
                        collapsed || mode === 'mixture'
                            ? 'w-54'
                            : 'w-(--reka-dropdown-menu-trigger-width)',
                }"
            >
                <!-- 通用插槽模板 -->
                <template #chip-leading="{ item }">
                    <span
                        :style="{ backgroundColor: (item as any).chip }"
                        class="ms-0.5 size-2 rounded-full"
                    />
                </template>
                <template #chip-trailing="{ item }">
                    <UIcon
                        v-if="(item as DropdownMenuItem).children"
                        name="i-lucide-chevron-right"
                        class="text-muted-foreground text-lg"
                    />
                </template>
                <template #lang-leading="{ item }">
                    {{ (item as DropdownMenuItem).icon }}
                </template>
                <template #item="{ item }">
                    <div
                        v-if="item?.label === 'profile'"
                        class="flex px-1 pt-1.5"
                        @click="smartNavigate(`/profile/${userStore.userInfo?.id}`)"
                    >
                        <UAvatar
                            :src="userStore.userInfo?.avatar"
                            :alt="userStore.userInfo?.nickname"
                            :icon="userStore.userInfo?.nickname ? 'tabler:user' : undefined"
                            size="lg"
                            :ui="{ root: 'rounded-lg' }"
                        />
                        <div class="ml-2 flex flex-col text-left">
                            <span class="block w-35 truncate text-sm font-medium">{{
                                userStore.userInfo?.nickname
                            }}</span>
                            <span class="text-muted-foreground text-xs">
                                {{ userStore.userInfo?.username }}
                            </span>
                        </div>
                    </div>
                    <div
                        v-else
                        class="text-foreground flex h-full w-full cursor-pointer items-center gap-2 px-1 py-1"
                    >
                        <UIcon :name="item.icon!" class="text-muted-foreground text-lg" />
                        <span class="text-sm">{{ item.label }}</span>
                    </div>
                    <UIcon
                        v-if="item.children"
                        name="i-lucide-chevron-right"
                        class="text-muted-foreground text-lg"
                    />
                    <UIcon
                        v-if="item.checked"
                        name="i-lucide-check"
                        class="text-muted-foreground text-lg"
                    />
                </template>

                <!-- Sidebar特有的触发器 -->
                <div
                    v-if="mode === 'sidebar'"
                    class="flex flex-1 items-center justify-center gap-2 select-none"
                    :class="{ 'flex-col': value }"
                >
                    <div class="flex flex-1 items-center gap-2">
                        <UAvatar
                            :src="userStore.userInfo?.avatar"
                            :alt="userStore.userInfo?.nickname"
                            :icon="userStore.userInfo?.nickname ? 'tabler:user' : undefined"
                            size="lg"
                            :ui="{ root: 'rounded-lg' }"
                        />
                        <div v-if="!value" class="flex w-[100px] flex-col">
                            <span class="truncate text-sm font-medium">
                                {{ userStore.userInfo?.nickname }}
                            </span>
                            <span class="text-secondary-foreground truncate text-xs">
                                {{ userStore.userInfo?.username }}
                            </span>
                        </div>
                    </div>
                    <div v-if="!value" class="flex items-center">
                        <Icon name="i-lucide-chevrons-up-down" class="text-muted" />
                    </div>
                </div>

                <!-- Mixed模式的触发器 -->
                <UAvatar
                    v-else-if="mode === 'mixture'"
                    :src="userStore.userInfo?.avatar"
                    :alt="userStore.userInfo?.nickname"
                    :icon="userStore.userInfo?.nickname ? 'tabler:user' : undefined"
                    size="lg"
                    :ui="{ root: 'rounded-lg' }"
                />
            </UDropdownMenu>
        </div>
    </div>
</template>
