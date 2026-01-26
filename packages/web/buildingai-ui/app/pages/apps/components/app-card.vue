<script setup lang="ts">
import type { ExtensionFormData } from "@buildingai/service/consoleapi/extensions";

/**
 * 应用卡片组件 Props
 */
const props = defineProps<{
    /** 应用数据 */
    extension: ExtensionFormData;
}>();

/**
 * 应用卡片组件 Emits
 */
const emit = defineEmits<{
    /** 点击事件 */
    click: [extension: ExtensionFormData];
}>();

/**
 * 处理卡片点击事件
 */
const handleClick = () => {
    emit("click", props.extension);
};
</script>

<template>
    <div
        class="group bg-muted border-border cursor-pointer rounded-lg border px-4 py-6 transition-all duration-200 hover:shadow-md"
        @click="handleClick"
    >
        <div class="flex flex-row justify-between gap-3">
            <div class="min-w-0 flex-1">
                <UTooltip :text="extension.alias || extension.name">
                    <h3 class="text-foreground text-4 line-clamp-1 truncate font-semibold">
                        {{ extension.alias || extension.name }}
                    </h3>
                </UTooltip>
                <p class="text-muted-foreground mt-1 line-clamp-2 h-10 text-sm">
                    {{
                        extension.aliasDescription ||
                        extension.description ||
                        $t("extensions.manage.noDescription")
                    }}
                </p>
            </div>
            <div
                class="bg-background flex size-18 flex-none items-center justify-center overflow-hidden rounded-xl"
            >
                <UAvatar
                    :src="extension.aliasIcon ? extension.aliasIcon : extension.icon"
                    :alt="extension.name"
                    icon="i-lucide-puzzle"
                    :ui="{
                        root: `size-full rounded-xl ${extension.icon ? '' : 'bg-primary'}`,
                        icon: 'size-7 text-white',
                    }"
                >
                </UAvatar>
            </div>
        </div>
    </div>
</template>
