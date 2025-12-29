<script setup lang="ts">
import BdPopover from "@/async-components/bd-popover/index.vue?async";
import { useLocale } from "@/hooks/use-locale";

const { currentLocale, locales, setLocale } = useLocale();
const appStore = useAppStore();
const { isLoaded } = useAsyncPackage("bd-popover");

const handleLocaleSelect = (locale: { label: string; value: string }) => {
    if (locale.value === currentLocale.value) {
        return;
    }
    setLocale(locale.value as "zh" | "en" | "jp");
};
</script>

<template>
    <view v-show="isLoaded">
        <BdPopover
            placement="end-top"
            :blur-intensity="4"
            :content-style="{
                width: '200rpx',
                background: 'var(--background-transparent)',
            }"
            @open="appStore.triggerHapticFeedback('light')"
        >
            <template #content>
                <view class="flex flex-col gap-0 pr-1" style="min-width: 150rpx">
                    <view
                        v-for="locale in locales"
                        :key="locale.value"
                        class="flex items-center gap-2 rounded-lg px-3 py-2.5 active:opacity-80"
                        :class="{
                            'bg-primary-50': currentLocale === locale.value,
                        }"
                        @click="handleLocaleSelect(locale)"
                    >
                        <text
                            class="text-foreground text-sm"
                            :class="{
                                'text-primary font-medium': currentLocale === locale.value,
                            }"
                        >
                            {{ locale.label }}
                        </text>
                        <text
                            v-if="currentLocale === locale.value"
                            class="i-lucide-check text-primary ml-auto text-base"
                        />
                    </view>
                </view>
            </template>
            <slot>
                <view class="flex items-center justify-center active:opacity-70">
                    <text class="i-carbon-chevron-right text-muted-foreground text-sm" />
                </view>
            </slot>
        </BdPopover>
    </view>
</template>
