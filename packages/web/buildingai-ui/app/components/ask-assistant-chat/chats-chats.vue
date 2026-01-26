<script setup lang="ts">
import type { AiConversation } from "@buildingai/service/webapi/ai-conversation";
import {
    apiDeleteAiConversation,
    apiGetAiConversationList,
    apiUpdateAiConversation,
    apiUpdateAiConversationPin,
} from "@buildingai/service/webapi/ai-conversation";
import { h, markRaw, ref, shallowRef, watch } from "vue";

import type { DropdownMenuItem } from "#ui/types";

import { groupConversationsByDate } from "../../utils";

const { t } = useI18n();
const controlsStore = useControlsStore();
const isMobile = useMediaQuery("(max-width: 768px)");

const open = shallowRef(false);

watch(
    isMobile,
    (newVal) => {
        if (newVal) {
            controlsStore.chatSidebarVisible = false;
        } else {
            open.value = false;
            controlsStore.chatSidebarVisible = true;
        }
    },
    { immediate: false },
);

const { data: chats, pending: loading } = await useAsyncData(
    "chats",
    () => apiGetAiConversationList({ page: 1, pageSize: 50 }),
    {
        lazy: import.meta.server,
    },
);

const route = useRoute();

// Reactive state - fix route parameter retrieval
const currentChatId = computed<string>(() => {
    // Get chat id from route parameters
    if (route.name === "chat-id") {
        return route.params.id as string;
    }
    return "";
});

const UInput = resolveComponent("UInput");
const UFormField = resolveComponent("UFormField");

/**
 * Conversations grouped by date
 */
const groupedChats = computed(() => {
    if (!chats.value?.items?.length) {
        return [];
    }
    return groupConversationsByDate<AiConversation>(chats.value.items, "updatedAt", t);
});

/**
 * Get current conversation from chats data
 */
const getCurrentConversation = computed(() => {
    if (!chats.value?.items || !currentChatId.value) {
        return null;
    }
    return chats.value.items.find((c) => c.id === currentChatId.value) || null;
});

/**
 * Open edit dialog
 */
async function openEditModal(category: AiConversation): Promise<void> {
    const editName = ref(category.title);

    try {
        const EditChatForm = markRaw({
            setup() {
                return () =>
                    h("div", { class: "py-2" }, [
                        h(
                            UFormField,
                            {
                                label: t("common.chat.chatTitleLabel"),
                                size: "lg",
                                required: true,
                                error: !editName.value.trim()
                                    ? t("common.chat.chatTitleRequired")
                                    : "",
                            },
                            {
                                default: () =>
                                    h(UInput, {
                                        modelValue: editName.value,
                                        "onUpdate:modelValue": (value: string) => {
                                            editName.value = value;
                                        },
                                        placeholder: t("common.chat.chatTitlePlaceholder"),
                                        maxlength: 50,
                                        class: "w-full",
                                        onKeyup: (e: KeyboardEvent) => {
                                            if (e.key === "Enter" && editName.value.trim()) {
                                                // Can handle Enter key confirmation here, but temporarily not handled due to useModal limitations
                                            }
                                        },
                                    }),
                            },
                        ),
                    ]);
            },
        });

        await useModal({
            title: t("common.chat.editChatTitle"),
            content: EditChatForm,
            confirmText: t("common.save"),
            cancelText: t("common.cancel"),
            color: "primary",
            ui: {
                content: "!w-sm",
            },
        });

        // Handle after user clicks confirm
        if (editName.value.trim() && editName.value !== category.title) {
            await apiUpdateAiConversation(category.id, {
                title: editName.value,
            });
            refreshNuxtData("chats");
            refreshNuxtData(`chat-detail-${category.id}`);
        }
    } catch (error) {
        // User cancelled operation or other error
        console.log("User cancelled edit operation:", error);
    }
}

/**
 * Handle delete conversation
 */
async function handleDeleteCategory(category: AiConversation): Promise<void> {
    try {
        const confirmed = await useModal({
            color: "error",
            title: t("common.chat.confirmDelete"),
            content: t("common.chat.confirmDeleteMessage"),
            confirmText: t("common.chat.confirmDeleteAction"),
            cancelText: t("common.cancel"),
            ui: {
                content: "!w-sm",
            },
        });

        if (confirmed) {
            await apiDeleteAiConversation(category.id);
            // Refresh data
            await refreshNuxtData("chats");
        }
        navigateTo("/");
    } catch (error) {
        // User cancelled operation or other error
        console.log("User cancelled delete operation or delete failed:", error);
    }
}

async function handlePinConversation(category: AiConversation): Promise<void> {
    await apiUpdateAiConversationPin(category.id, !category.isPinned);
    await refreshNuxtData("chats");
}

/**
 * Handle category selection
 */
function handleCategorySelect(category: AiConversation): void {
    navigateTo(`/chat/${category.id}`);
}

/**
 * Handle new chat creation
 */
function handleNewChat(): void {
    navigateTo("/");
}

/**
 * Handle opening sidebar
 */
const handleOpenSidebar = () => {
    if (isMobile.value) {
        open.value = true;
        controlsStore.chatSidebarVisible = false;
    } else {
        open.value = false;
        controlsStore.chatSidebarVisible = true;
    }
};

/**
 * Handle keyboard events (for accessibility)
 */
function handleKeyDown(event: KeyboardEvent, category: AiConversation): void {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleCategorySelect(category);
    }
}

/**
 * Build dropdown menu items
 */
const getDropdownItems = (category: AiConversation): DropdownMenuItem[] => [
    {
        label: category.isPinned ? t("common.chat.unpin") : t("common.chat.pin"),
        color: "primary",
        icon: category.isPinned ? "i-lucide-pin-off" : "i-lucide-pin",
        onSelect: () => handlePinConversation(category),
    },
    {
        label: t("common.edit"),
        color: "primary",
        icon: "i-lucide-pencil",
        onSelect: () => openEditModal(category),
    },
    {
        label: t("common.delete"),
        color: "error",
        icon: "i-lucide-trash",
        onSelect: () => handleDeleteCategory(category),
    },
];

defineOptions({ inheritAttrs: false });
defineShortcuts({
    o: () => (open.value = !open.value),
});
</script>

<template>
    <ClientOnly>
        <div class="relative h-full flex-1">
            <!-- Main panel area -->
            <transition name="sidebar">
                <div
                    v-if="controlsStore.chatSidebarVisible"
                    class="flex h-full min-h-0 w-[240px] flex-col"
                >
                    <!-- Header section -->
                    <div class="border-border/50 flex gap-2 border-b px-1 py-3">
                        <!-- New chat button -->
                        <UButton
                            :ui="{ base: 'w-full' }"
                            color="primary"
                            variant="soft"
                            @click="handleNewChat"
                        >
                            <UIcon name="i-lucide-sparkles" class="mr-2 size-4" />
                            {{ t("common.chat.newChat") }}
                        </UButton>

                        <UButton
                            color="neutral"
                            variant="ghost"
                            class="p-2"
                            @click="controlsStore.chatSidebarVisible = false"
                        >
                            <UIcon name="i-lucide-history" class="size-5" />
                        </UButton>
                    </div>

                    <!-- Chat list -->
                    <div class="h-full flex-1 overflow-hidden">
                        <!-- Empty state -->
                        <div
                            v-if="!groupedChats.length && !loading"
                            class="text-muted-foreground flex h-full flex-col items-center justify-center text-center text-sm"
                        >
                            <div class="mb-2">
                                <UIcon
                                    name="i-lucide-message-circle"
                                    size="lg"
                                    class="text-muted-foreground"
                                />
                            </div>
                            <p>{{ t("common.chat.noChats") }}</p>
                            <p class="text-xs">{{ t("common.chat.noChatsSubtitle") }}</p>
                        </div>

                        <BdScrollArea v-else class="grid h-full">
                            <!-- Chat list -->
                            <div class="flex flex-col gap-4 space-y-1 py-4 pr-4 pl-2">
                                <!-- Display grouped by date -->
                                <div
                                    v-for="group in groupedChats"
                                    :key="group.key"
                                    class="flex flex-col gap-2"
                                >
                                    <!-- Group title -->
                                    <div
                                        v-if="group.label"
                                        class="text-muted-foreground px-2 py-1 text-xs font-medium"
                                    >
                                        {{ group.label }}
                                    </div>

                                    <!-- Conversation items within group -->
                                    <div class="flex flex-col gap-1">
                                        <div
                                            v-for="category in group.items"
                                            :key="category.id"
                                            class="group relative"
                                        >
                                            <UButton
                                                :label="category.title"
                                                :ui="{
                                                    base: 'flex justify-between w-full gap-2 cursor-pointer pr-10 relative w-full',
                                                }"
                                                :variant="
                                                    category.id === currentChatId ? 'soft' : 'ghost'
                                                "
                                                :color="
                                                    category.id === currentChatId
                                                        ? 'primary'
                                                        : 'neutral'
                                                "
                                                @click="handleCategorySelect(category)"
                                                @keydown="
                                                    (event: KeyboardEvent) =>
                                                        handleKeyDown(event, category)
                                                "
                                            >
                                                <span class="block flex-1 truncate text-left">
                                                    {{ category.title || t("common.chat.newChat") }}
                                                </span>
                                            </UButton>

                                            <UIcon
                                                v-if="category.isPinned"
                                                name="i-lucide-pin"
                                                :size="16"
                                                class="bg-primary/50 absolute top-1/2 right-3 z-10 -translate-y-1/2 cursor-pointer px-2.5 py-1.5 transition-opacity group-hover:opacity-0"
                                                :class="{
                                                    'opacity-0': category.id === currentChatId,
                                                    'opacity-100': category.id !== currentChatId,
                                                }"
                                                @click.stop
                                            />

                                            <!-- Action menu -->
                                            <UDropdownMenu
                                                :items="[getDropdownItems(category)]"
                                                :ui="{
                                                    content: 'w-3',
                                                    group: 'flex flex-col gap-1 p-2',
                                                    itemLeadingIcon: 'size-4',
                                                }"
                                                :content="{ side: 'right', align: 'start' }"
                                            >
                                                <UIcon
                                                    name="i-lucide-ellipsis"
                                                    :size="14"
                                                    class="absolute top-1/2 right-3 z-10 h-8 -translate-y-1/2 cursor-pointer px-2.5 py-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                                                    :class="{
                                                        'opacity-100':
                                                            category.id === currentChatId,
                                                    }"
                                                    @click.stop
                                                />
                                            </UDropdownMenu>
                                        </div>
                                    </div>
                                </div>

                                <!-- Loading state -->
                                <div
                                    v-if="!groupedChats.length && loading"
                                    class="flex flex-col gap-4 py-4"
                                >
                                    <div
                                        v-for="groupIndex in 3"
                                        :key="`group-${groupIndex}`"
                                        class="flex flex-col gap-2"
                                    >
                                        <div class="px-2 py-1">
                                            <USkeleton class="h-4 w-16" />
                                        </div>

                                        <div class="flex flex-col gap-1">
                                            <USkeleton
                                                v-for="itemIndex in groupIndex === 1
                                                    ? 3
                                                    : groupIndex === 2
                                                      ? 2
                                                      : 1"
                                                :key="`item-${groupIndex}-${itemIndex}`"
                                                class="h-10 w-full rounded-md"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </BdScrollArea>
                    </div>
                </div>
            </transition>

            <!-- Floating expand button (shown when collapsed) -->
            <div
                class="absolute top-2 left-2 z-50 flex items-center gap-2"
                v-if="!controlsStore.chatSidebarVisible"
            >
                <UButton
                    color="neutral"
                    variant="ghost"
                    size="lg"
                    class="p-2"
                    @click="handleOpenSidebar"
                >
                    <UIcon name="i-lucide-history" class="size-5" />
                </UButton>

                <!-- Hide separator and chat info on small screens (below 640px) -->
                <div class="text-muted-foreground mx-1 hidden sm:block">/</div>

                <!-- Current selected chat or new chat - hidden on small screens -->
                <div class="group relative hidden sm:block">
                    <UButton
                        v-if="!currentChatId"
                        variant="ghost"
                        color="neutral"
                        size="sm"
                        class="px-3 py-2"
                    >
                        <span class="block flex-1 truncate text-left text-sm">{{
                            t("common.chat.newChat")
                        }}</span>
                    </UButton>

                    <!-- Action menu (only shown when there's a selected chat) -->
                    <UDropdownMenu
                        v-else
                        :items="[
                            {
                                label: t('common.delete'),
                                color: 'error',
                                icon: 'i-lucide-trash',
                                onSelect: () => {
                                    const currentConv = getCurrentConversation;
                                    if (currentConv) {
                                        handleDeleteCategory(currentConv);
                                    }
                                },
                            },
                            {
                                label: t('common.chat.newChat'),
                                color: 'primary',
                                icon: 'i-lucide-sparkles',
                                onSelect: () => handleNewChat(),
                            },
                        ]"
                        :ui="{
                            group: 'flex flex-col gap-1 p-2',
                            itemLeadingIcon: 'size-4',
                        }"
                        :content="{ side: 'bottom', align: 'center' }"
                    >
                        <UButton
                            :label="getCurrentConversation?.title || t('common.chat.currentChat')"
                            variant="ghost"
                            color="neutral"
                            size="sm"
                            class="px-3 py-2"
                        >
                            <span class="block flex-1 truncate text-left text-sm">
                                {{ getCurrentConversation?.title || t("common.chat.currentChat") }}
                            </span>
                            <UIcon name="i-lucide-chevron-down" class="size-5" />
                        </UButton>
                    </UDropdownMenu>
                </div>
            </div>

            <!-- Mobile sidebar -->
            <USlideover
                v-model:open="open"
                side="left"
                :ui="{ content: '!w-fit flex-0 max-w-fit' }"
            >
                <template #content>
                    <!-- Empty state -->
                    <div
                        v-if="!groupedChats.length && !loading"
                        class="text-muted-foreground flex h-full flex-col items-center justify-center text-center text-sm"
                    >
                        <div class="mb-2">
                            <UIcon name="i-lucide-message-circle" size="lg" class="text-gray-400" />
                        </div>
                        <p>{{ t("common.chat.noChats") }}</p>
                        <p class="text-xs">{{ t("common.chat.noChatsSubtitle") }}</p>
                    </div>

                    <BdScrollArea v-else class="h-full">
                        <!-- Chat list -->
                        <div class="flex flex-col gap-4 space-y-1 py-4 pr-4 pl-2">
                            <!-- Display grouped by date -->
                            <div
                                v-for="group in groupedChats"
                                :key="group.key"
                                class="flex flex-col gap-2"
                            >
                                <!-- Group title -->
                                <div class="text-muted-foreground px-2 py-1 text-xs font-medium">
                                    {{ group.label }}
                                </div>

                                <!-- Conversation items within group -->
                                <div class="flex flex-col gap-1">
                                    <div
                                        v-for="category in group.items"
                                        :key="category.id"
                                        class="group relative"
                                    >
                                        <UButton
                                            :label="category.title"
                                            :ui="{
                                                base: 'flex justify-between w-full gap-2 cursor-pointer pr-10 relative w-full',
                                            }"
                                            :variant="
                                                category.id === currentChatId ? 'soft' : 'ghost'
                                            "
                                            :color="
                                                category.id === currentChatId
                                                    ? 'primary'
                                                    : 'neutral'
                                            "
                                            @click="handleCategorySelect(category)"
                                        >
                                            <span class="block flex-1 truncate text-left">
                                                {{ category.title || t("common.chat.newChat") }}
                                            </span>
                                        </UButton>

                                        <!-- Action menu -->
                                        <UDropdownMenu
                                            :items="[getDropdownItems(category)]"
                                            :ui="{
                                                content: 'w-3',
                                                group: 'flex flex-col gap-1 p-2',
                                                itemLeadingIcon: 'size-4',
                                            }"
                                            :content="{ side: 'right', align: 'start' }"
                                        >
                                            <UIcon
                                                name="i-lucide-ellipsis"
                                                :size="14"
                                                class="absolute top-1/2 right-3 z-10 h-8 -translate-y-1/2 cursor-pointer px-2.5 py-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                                                :class="{
                                                    'opacity-100': category.id === currentChatId,
                                                }"
                                                @click.stop
                                            />
                                        </UDropdownMenu>
                                    </div>
                                </div>
                            </div>

                            <!-- Loading state -->
                            <div
                                v-if="!groupedChats.length && loading"
                                class="flex flex-col gap-4 py-4"
                            >
                                <div
                                    v-for="groupIndex in 3"
                                    :key="`group-${groupIndex}`"
                                    class="flex flex-col gap-2"
                                >
                                    <div class="px-2 py-1">
                                        <USkeleton class="h-4 w-16" />
                                    </div>

                                    <div class="flex flex-col gap-1">
                                        <USkeleton
                                            v-for="itemIndex in groupIndex === 1
                                                ? 3
                                                : groupIndex === 2
                                                  ? 2
                                                  : 1"
                                            :key="`item-${groupIndex}-${itemIndex}`"
                                            class="h-10 w-full rounded-md"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </BdScrollArea>
                </template>
            </USlideover>
        </div>
    </ClientOnly>
</template>

<style scoped>
.sidebar-enter-active,
.sidebar-leave-active {
    transition:
        width 0.2s cubic-bezier(0.4, 0, 0.2, 1),
        opacity 0.1s ease;
    overflow: hidden;
    white-space: nowrap;
}

.sidebar-enter-from,
.sidebar-leave-to {
    width: 0;
    opacity: 0;
}
</style>
