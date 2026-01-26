<script setup lang="ts">
import type { BdModalUseProps } from "./types";

/**
 * BdModalUse component
 * Used for dynamic calling of useModal module, please do not change it随意更改
 */
const props = defineProps<BdModalUseProps>();

const emit = defineEmits<{ close: [boolean] }>();

function handleConfirm() {
    emit("close", true);
    props.confirm();
}

function handleCancel() {
    emit("close", true);
    props.cancel();
}

// Ensure we control what goes to UModal explicitly and forward rest via $attrs
defineOptions({ inheritAttrs: false });
</script>

<template>
    <UModal
        v-bind="$attrs"
        :title="title"
        :description="description"
        :ui="ui"
        :dismissible="dismissible"
        @close="emit('close', false)"
    >
        <template #header />
        <template #content>
            <div :id="contentId" class="relative flex flex-col gap-4 p-4 sm:p-6">
                <!-- Modal header -->
                <div v-if="!!props.header" class="pr-">
                    <div
                        v-if="typeof props.header === 'string'"
                        class="text-base"
                        v-html="header"
                    />
                    <component v-else :is="header" />
                </div>
                <div v-else class="pr- flex items-center gap-4">
                    <div>
                        <h2 class="text-lg font-medium md:text-xl">
                            {{ title }}
                        </h2>
                        <p v-if="description" class="text-muted-foreground mt-1 text-sm">
                            {{ description }}
                        </p>
                    </div>
                </div>
                <UButton
                    class="absolute top-4 right-4"
                    icon="tabler:x"
                    color="neutral"
                    size="sm"
                    variant="ghost"
                    aria-label="Close modal"
                    @click="emit('close', false)"
                />
                <div class="flex flex-col gap-5">
                    <!-- Content -->
                    <div v-if="typeof content === 'string'" class="text-base" v-html="content" />
                    <component :is="content" v-else />
                    <!-- Bottom buttons -->
                    <div v-if="showCancel || showConfirm" class="flex w-full justify-end gap-4">
                        <UButton
                            v-if="showCancel"
                            color="neutral"
                            variant="soft"
                            size="lg"
                            :label="cancelText || $t('common.cancel')"
                            @click="handleCancel"
                        />
                        <UButton
                            v-if="showConfirm"
                            :color="color"
                            size="lg"
                            :label="confirmText || $t('common.confirm')"
                            @click="handleConfirm"
                        />
                    </div>
                </div>
            </div>
        </template>
    </UModal>
</template>
