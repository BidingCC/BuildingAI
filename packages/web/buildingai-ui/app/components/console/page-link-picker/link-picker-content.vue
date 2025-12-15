<script lang="ts" setup>
/**
 * 链接选择器内容组件
 * @description 模态框内的主要内容，包含功能切换和内容显示
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import { type _LinkType, type LinkItem, type LinkPickerOption, LinkType } from "./layout.d";

const SystemPageProvider = defineAsyncComponent(
    () => import("./providers/system-page-provider.vue"),
);
const PluginPageProvider = defineAsyncComponent(
    () => import("./providers/plugin-page-provider.vue"),
);
const MicropageProvider = defineAsyncComponent(() => import("./providers/micropage-provider.vue"));
const CustomLinkProvider = defineAsyncComponent(
    () => import("./providers/custom-link-provider.vue"),
);

const { t } = useI18n();

// 组件属性
const props = withDefaults(
    defineProps<{
        /** Currently selected link */
        selected?: LinkItem | null;
        /** Mode: mobile or web */
        mode?: "mobile" | "web";
    }>(),
    {
        selected: null,
        mode: "web",
    },
);

// 组件事件
const emit = defineEmits<{
    /** Select link event */
    (e: "select", link: LinkItem): void;
    /** Close event */
    (e: "close"): void;
}>();

// 响应式状态
const activeTab = ref<_LinkType>(props.selected?.type || LinkType.SYSTEM);
const searchQuery = ref("");

// 组件映射表，用于动态组件
const componentMap = {
    [LinkType.SYSTEM]: SystemPageProvider,
    [LinkType.PLUGIN]: PluginPageProvider,
    [LinkType.MICROPAGE]: MicropageProvider,
    [LinkType.CUSTOM]: CustomLinkProvider,
};

// 当前激活的组件
const currentComponent = computed(() => componentMap[activeTab.value]);

// 组件属性映射
const componentProps = computed(() => {
    const baseProps = {
        selected: props.selected,
    };

    // 自定义链接组件需要特殊处理
    if (activeTab.value === LinkType.CUSTOM) {
        return {
            ...baseProps,
            selected: props.selected?.path || null,
        };
    }

    // 系统页面组件需要传递 mode
    if (activeTab.value === LinkType.SYSTEM) {
        return {
            ...baseProps,
            searchQuery: searchQuery.value,
            mode: props.mode,
        };
    }

    // 其他组件都需要搜索查询参数
    return {
        ...baseProps,
        searchQuery: searchQuery.value,
    };
});

// 功能选项配置
const linkOptions: LinkPickerOption[] = [
    {
        key: LinkType.SYSTEM,
        label: t("console-common.linkPicker.tabs.system"),
        icon: "i-heroicons-home",
    },
    {
        key: LinkType.PLUGIN,
        label: t("console-common.linkPicker.tabs.plugin"),
        icon: "i-heroicons-puzzle-piece",
    },
    {
        key: LinkType.MICROPAGE,
        label: t("console-common.linkPicker.tabs.micropage"),
        icon: "i-heroicons-document-text",
    },
    {
        key: LinkType.CUSTOM,
        label: t("console-common.linkPicker.tabs.custom"),
        icon: "i-heroicons-link",
    },
];

const searchPlaceholder = computed(() => {
    switch (activeTab.value) {
        case LinkType.SYSTEM:
            return t("console-common.linkPicker.searchPlaceholder.system");
        case LinkType.PLUGIN:
            return t("console-common.linkPicker.searchPlaceholder.plugin");
        case LinkType.MICROPAGE:
            return t("console-common.linkPicker.searchPlaceholder.micropage");
        default:
            return t("console-common.linkPicker.searchPlaceholder.default");
    }
});

/**
 * 切换功能选项卡
 */
const switchTab = (type: _LinkType) => {
    activeTab.value = type;
    searchQuery.value = "";
};

/**
 * 处理链接选择
 */
const handleLinkSelect = (link: LinkItem) => {
    emit("select", link);
};
</script>

<template>
    <div class="link-picker-content flex h-full pt-2">
        <!-- 左侧功能切换 -->
        <div class="bg-muted w-44 p-2">
            <div class="space-y-2">
                <div
                    v-for="option in linkOptions"
                    :key="option.key"
                    :class="[
                        'flex w-full cursor-pointer items-start gap-3 rounded-lg px-4 py-2.5 text-left transition-all duration-200',
                        activeTab === option.key
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted text-sidebar-foreground',
                    ]"
                    @click="switchTab(option.key)"
                >
                    <UIcon
                        :name="option.icon"
                        :class="[
                            'mt-0.5 h-5 w-5 flex-none',
                            activeTab === option.key ? 'text-primary' : 'text-muted-foreground',
                        ]"
                    />
                    <div class="min-w-0 flex-1">
                        <div class="text-sm font-medium">{{ option.label }}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 右侧内容区域 -->
        <div class="flex min-w-0 flex-1 flex-col" style="min-height: 600px">
            <!-- 头部搜索区域 -->
            <div class="flex justify-end pl-6">
                <!-- 搜索框（仅在系统页面和插件页面显示） -->
                <UInput
                    v-if="activeTab !== LinkType.CUSTOM"
                    v-model="searchQuery"
                    :placeholder="searchPlaceholder"
                    icon="i-heroicons-magnifying-glass"
                    size="lg"
                />
            </div>

            <!-- 内容区域 -->
            <div class="flex-1">
                <!-- 使用 KeepAlive 缓存组件，避免重复渲染 -->
                <KeepAlive>
                    <component
                        :is="currentComponent"
                        :key="activeTab"
                        v-bind="componentProps"
                        @select="handleLinkSelect"
                    />
                </KeepAlive>
            </div>
        </div>
    </div>
</template>
