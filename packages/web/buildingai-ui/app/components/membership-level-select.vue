<script setup lang="ts">
import type { MembershipLevel } from "@buildingai/service/webapi/member-center";
import { apiGetMembershipLevels } from "@buildingai/service/webapi/member-center";

import type { ButtonProps } from "#ui/types";

/**
 * 会员等级选择组件 Props
 */
const props = withDefaults(
    defineProps<{
        /** 绑定值（会员等级ID，多选模式下为数组） */
        modelValue?: string | string[];
        /** 是否禁用 */
        disabled?: boolean;
        /** 是否显示描述 */
        showDescription?: boolean;
        /** 是否默认选中第一个 */
        defaultSelected?: boolean;
        /** 是否支持多选 */
        multiple?: boolean;
        /** 按钮样式配置 */
        buttonUi?: ButtonProps;
        /** 是否显示权益信息 */
        showBenefits?: boolean;
        /** 占位文本 */
        placeholder?: string;
    }>(),
    {
        showDescription: true,
        defaultSelected: false,
        multiple: false,
        showBenefits: false,
        placeholder: "",
    },
);

/**
 * 组件事件
 */
const emit = defineEmits<{
    /** 值更新事件 */
    (e: "update:modelValue", value: string | string[]): void;
    /** 选择变更事件 */
    (e: "change", value: MembershipLevel | MembershipLevel[] | null): void;
}>();

const { t } = useI18n();

/** 加载状态 */
const loading = shallowRef(false);
/** 弹出框开关状态 */
const isOpen = shallowRef(false);
/** 搜索关键词 */
const search = shallowRef("");
/** 会员等级列表 */
const levels = shallowRef<MembershipLevel[]>([]);
/** 单选模式下选中的等级 */
const selected = shallowRef<MembershipLevel | null>(null);
/** 多选模式下选中的等级ID列表 */
const selectedIds = ref<Set<string>>(new Set());
/** 滚动区域引用 */
const scrollAreaRef = useTemplateRef("scrollAreaRef");

/**
 * 根据搜索关键词过滤会员等级列表
 */
const filteredLevels = computed(() => {
    const query = search.value.trim().toLowerCase();
    if (!query) return levels.value;
    return levels.value.filter(
        (level) =>
            level.name.toLowerCase().includes(query) ||
            level.description?.toLowerCase().includes(query),
    );
});

/** 选中的列表数据 */
const selectedItems = computed(() => {
    if (props.multiple) {
        return levels.value.filter((l) => selectedIds.value.has(l.id));
    }
    return selected.value ? [selected.value] : [];
});

/** 展示的列表数据（最多显示2个） */
const displayItems = computed(() => {
    return selectedItems.value.slice(0, 3);
});

/** 剩余数量 */
const overflowCount = computed(() => {
    return Math.max(0, selectedItems.value.length - 3);
});

/** 移除单个项目 */
function removeItem(item: MembershipLevel) {
    if (props.disabled) return;
    if (props.multiple) {
        toggleLevel(item);
    } else {
        selectLevel(null);
    }
}

/**
 * 选择会员等级（单选模式）
 * @param level 选中的会员等级
 */
function selectLevel(level: MembershipLevel | null) {
    if (props.multiple) return;

    selected.value = level;
    emit("update:modelValue", level?.id || "");
    emit("change", level);
    isOpen.value = false;
    search.value = "";
}

/**
 * 切换会员等级选中状态（多选模式）
 * @param level 会员等级
 */
function toggleLevel(level: MembershipLevel) {
    if (!props.multiple) {
        selectLevel(level);
        return;
    }

    const newSet = new Set(selectedIds.value);
    if (newSet.has(level.id)) {
        newSet.delete(level.id);
    } else {
        newSet.add(level.id);
    }
    selectedIds.value = newSet;

    const selectedLevels = levels.value.filter((l) => newSet.has(l.id));
    emit("update:modelValue", Array.from(newSet));
    emit("change", selectedLevels);
}

/**
 * 检查等级是否被选中
 * @param levelId 等级ID
 */
function isSelected(levelId: string): boolean {
    if (props.multiple) {
        return selectedIds.value.has(levelId);
    }
    return selected.value?.id === levelId;
}

/**
 * 加载会员等级列表
 */
async function loadLevels() {
    if (loading.value) return;
    loading.value = true;
    try {
        levels.value = await apiGetMembershipLevels();

        const findLevel = (id?: string) => levels.value.find((l) => l.id === id);

        if (props.multiple) {
            // 多选模式：初始化已选中的ID
            if (Array.isArray(props.modelValue)) {
                selectedIds.value = new Set(props.modelValue);
            } else if (props.modelValue) {
                selectedIds.value = new Set([props.modelValue]);
            }
        } else {
            // 单选模式：确保取单个字符串值
            const singleValue = Array.isArray(props.modelValue)
                ? props.modelValue[0]
                : props.modelValue;

            if (!props.defaultSelected) {
                selected.value = findLevel(singleValue) ?? null;
                return;
            }

            selected.value = findLevel(singleValue) ?? levels.value[0] ?? null;

            if (selected.value) {
                selectLevel(selected.value);
            }
        }
    } catch (error) {
        console.error("Failed to load membership levels:", error);
    } finally {
        loading.value = false;
    }
}

/**
 * 滚动到选中的等级
 */
async function scrollToSelected() {
    if (!isOpen.value || !scrollAreaRef.value) return;

    const targetId = props.multiple ? Array.from(selectedIds.value)[0] : selected.value?.id;

    if (!targetId) return;

    await nextTick();
    const selectedElement = document.querySelector(`[data-level-id="${targetId}"]`);
    selectedElement?.scrollIntoView({ behavior: "smooth", block: "center" });
}

// 监听弹出框状态
watch(isOpen, (open) => {
    if (open) scrollToSelected();
});

// 监听外部值变化
watch(
    () => props.modelValue,
    (newValue) => {
        if (loading.value || !levels.value.length) return;

        if (props.multiple) {
            if (Array.isArray(newValue)) {
                selectedIds.value = new Set(newValue);
            } else if (newValue) {
                selectedIds.value = new Set([newValue]);
            } else {
                selectedIds.value = new Set();
            }
        } else {
            // 单选模式：确保取单个字符串值
            const singleValue = Array.isArray(newValue) ? newValue[0] : newValue;
            const level = levels.value.find((l) => l.id === singleValue);
            if (level) {
                selected.value = level;
            }
        }
    },
);

// 组件挂载时加载数据
onMounted(loadLevels);
</script>

<template>
    <UPopover v-model:open="isOpen" :disabled="props.disabled">
        <!-- 触发按钮 -->
        <UButton
            color="neutral"
            variant="ghost"
            class="flex min-h-8 w-full items-center justify-between py-2"
            :loading="loading"
            :disabled="props.disabled"
            v-bind="props.buttonUi"
            @click.stop
        >
            <div class="flex flex-1 items-center gap-1.5 overflow-hidden text-left">
                <template v-if="selectedItems.length > 0">
                    <UBadge
                        v-for="item in displayItems"
                        :key="item.id"
                        variant="outline"
                        color="neutral"
                        class="flex shrink-0 items-center gap-1"
                        @click.stop
                    >
                        <span class="truncate">{{ item.name }}</span>
                        <UIcon
                            name="i-lucide-x"
                            class="hover:text-primary h-3 w-3 cursor-pointer"
                            @click.stop="removeItem(item)"
                        />
                    </UBadge>
                    <UBadge
                        v-if="overflowCount > 0"
                        variant="soft"
                        color="neutral"
                        class="shrink-0"
                    >
                        +{{ overflowCount }}...
                    </UBadge>
                </template>
                <span
                    v-else
                    class="truncate"
                    :class="{ 'text-muted-foreground': !selectedItems.length }"
                >
                    {{ props.placeholder || t("common.placeholder.levelSelect") }}
                </span>
            </div>
            <div class="ml-1 flex shrink-0 items-center gap-2">
                <UIcon
                    name="i-lucide-chevron-down"
                    class="text-muted-foreground h-4 w-4"
                    :class="{ 'rotate-180': isOpen }"
                />
            </div>
        </UButton>

        <!-- 弹出内容 -->
        <template #content>
            <div class="border-border bg-background w-[320px] rounded-lg border shadow-lg">
                <!-- 搜索栏 -->
                <div class="p-3">
                    <UInput
                        v-model="search"
                        :placeholder="t('common.placeholder.searchLevel')"
                        size="sm"
                        class="w-full"
                        :ui="{
                            base: 'bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20',
                        }"
                    >
                        <template #leading>
                            <UIcon name="i-lucide-search" class="text-muted-foreground h-4 w-4" />
                        </template>
                    </UInput>
                </div>

                <!-- 内容区域 -->
                <div class="grid h-full">
                    <BdScrollArea
                        ref="scrollAreaRef"
                        class="max-h-[350px] min-h-[150px] px-2 pb-2"
                        type="hover"
                        :shadow="false"
                    >
                        <!-- 加载状态 -->
                        <div
                            v-if="loading"
                            class="text-muted-foreground flex flex-col items-center justify-center py-12"
                        >
                            <UIcon name="i-lucide-loader-2" class="mb-2 h-6 w-6 animate-spin" />
                            <span class="text-sm">{{ t("common.loading") }}</span>
                        </div>

                        <!-- 空状态 -->
                        <div
                            v-else-if="!filteredLevels.length"
                            class="text-muted-foreground flex flex-col items-center justify-center py-12"
                        >
                            <UIcon name="i-lucide-crown" class="mb-3 h-8 w-8 opacity-50" />
                            <span class="text-sm font-medium">
                                {{ search ? t("common.noSearchResults") : t("common.empty") }}
                            </span>
                            <span class="mt-1 text-xs">
                                {{
                                    search
                                        ? t("common.tryOtherKeywords")
                                        : t("common.noAvailableLevels")
                                }}
                            </span>
                        </div>

                        <!-- 等级列表 -->
                        <div v-else class="space-y-1 py-1">
                            <div
                                v-for="level in filteredLevels"
                                :key="level.id"
                                :data-level-id="level.id"
                                class="group hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                                :class="{
                                    'bg-primary/10 hover:bg-primary/15': isSelected(level.id),
                                }"
                                @click="toggleLevel(level)"
                            >
                                <!-- 等级图标 -->
                                <div class="flex-none">
                                    <NuxtImg
                                        v-if="level.icon"
                                        :src="level.icon"
                                        :alt="level.name"
                                        class="h-8 w-8 rounded-full object-cover"
                                    />
                                    <div
                                        v-else
                                        class="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full"
                                    >
                                        <UIcon name="i-lucide-crown" class="h-4 w-4" />
                                    </div>
                                </div>

                                <!-- 等级信息 -->
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-2">
                                        <span
                                            class="truncate font-medium"
                                            :class="{
                                                'text-primary': isSelected(level.id),
                                                'text-foreground': !isSelected(level.id),
                                            }"
                                        >
                                            {{ level.name }}
                                        </span>
                                        <UBadge variant="soft" color="neutral" size="xs">
                                            Lv.{{ level.level }}
                                        </UBadge>
                                    </div>
                                    <p
                                        v-if="props.showDescription && level.description"
                                        class="text-muted-foreground mt-0.5 line-clamp-1 text-xs"
                                    >
                                        {{ level.description }}
                                    </p>
                                    <div
                                        v-if="level.givePower > 0"
                                        class="text-muted-foreground mt-1 flex items-center gap-1 text-xs"
                                    >
                                        <UIcon name="i-lucide-zap" class="h-3 w-3" />
                                        <span
                                            >{{ t("common.givePower") }}:
                                            {{ level.givePower }}</span
                                        >
                                    </div>
                                </div>

                                <!-- 选中标记 -->
                                <div class="flex-none">
                                    <UIcon
                                        v-if="isSelected(level.id)"
                                        name="i-lucide-check"
                                        class="text-primary h-4 w-4"
                                    />
                                </div>
                            </div>
                        </div>
                    </BdScrollArea>
                </div>
            </div>
        </template>
    </UPopover>
</template>
