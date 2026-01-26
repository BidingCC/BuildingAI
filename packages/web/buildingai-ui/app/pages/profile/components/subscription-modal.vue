<script setup lang="ts">
import type { UserSubscriptionItem } from "@buildingai/service/webapi/member-center";
import { apiGetUserSubscriptions } from "@buildingai/service/webapi/member-center";

/**
 * 订阅管理弹窗组件
 * @description 展示用户的所有订阅记录，支持下拉加载更多
 */

const { t } = useI18n();

/** 弹窗开关状态 */
const isOpen = ref(false);

/** 订阅列表数据 */
const subscriptions = shallowRef<UserSubscriptionItem[]>([]);

/** 加载状态 */
const loading = shallowRef(false);

/** 是否有更多数据 */
const hasMore = shallowRef(false);

/** 分页参数 */
const queryPaging = reactive({
    page: 1,
    pageSize: 10,
});

/** 滚动区域引用 */
const scrollAreaRef = useTemplateRef<{
    scrollToBottom: (animate?: boolean) => void;
    getViewportElement: () => { viewportElement: HTMLElement };
}>("scrollAreaRef");

/**
 * 加载订阅列表
 * @param reset 是否重置列表（首次加载或刷新时为 true）
 */
const loadSubscriptions = async (reset = false): Promise<void> => {
    if (reset) {
        queryPaging.page = 1;
        subscriptions.value = [];
    }

    loading.value = true;
    try {
        const data = await apiGetUserSubscriptions(queryPaging);
        const newItems = data.items || [];

        // 加载更多时，新数据添加到列表后面
        subscriptions.value = reset ? newItems : [...subscriptions.value, ...newItems];
        hasMore.value = data.total > subscriptions.value.length;
    } catch (error) {
        console.error("加载订阅列表失败:", error);
    } finally {
        loading.value = false;
    }
};

/**
 * 加载更多订阅记录
 */
const loadMoreSubscriptions = async (): Promise<void> => {
    if (!hasMore.value || loading.value) return;

    queryPaging.page++;
    try {
        await loadSubscriptions(false);
    } catch (_error) {
        // 加载失败时回退页码
        queryPaging.page--;
        hasMore.value = true;
    }
};

/**
 * 格式化日期时间
 * @param dateStr 日期字符串
 * @param mode 显示模式：date-仅日期，datetime-日期时间
 */
const formatDateTime = (dateStr: string, mode: "date" | "datetime" = "datetime"): string => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions =
        mode === "date"
            ? { year: "numeric", month: "2-digit", day: "2-digit" }
            : {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
              };
    return date.toLocaleString("zh-CN", options);
};

/**
 * 监听弹窗开关状态，打开时加载数据
 */
watch(
    () => isOpen.value,
    async (open: boolean) => {
        if (open) {
            await loadSubscriptions(true);
        }
    },
);

/**
 * 组件挂载时加载数据
 * @description 支持 overlay.create 方式打开弹窗时自动加载数据
 */
onMounted(async () => {
    await loadSubscriptions(true);
});
</script>

<template>
    <BdModal
        v-model:open="isOpen"
        :title="t('membership.frontend.center.subscriptionManagement')"
        width="sm"
        :show-footer="false"
        :ui="{ content: 'h-[60vh]' }"
    >
        <template #trigger>
            <slot></slot>
        </template>

        <!-- 加载状态 -->
        <div
            v-if="loading && subscriptions.length === 0"
            class="flex h-48 items-center justify-center"
        >
            <div class="text-muted-foreground flex items-center gap-2 text-sm">
                <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
                加载中...
            </div>
        </div>

        <!-- 空状态 -->
        <div
            v-else-if="!loading && subscriptions.length === 0"
            class="flex h-48 items-center justify-center"
        >
            <div class="text-muted-foreground text-center">
                <UIcon name="i-lucide-inbox" class="mx-auto mb-2 size-12" />
                <p>{{ t("membership.frontend.center.noSubscription") }}</p>
            </div>
        </div>

        <!-- 订阅列表 -->
        <BdScrollArea v-else class="w-full" type="auto" ref="scrollAreaRef">
            <BdInfiniteScroll
                :loading="loading"
                :has-more="hasMore"
                :threshold="200"
                loading-text="加载中..."
                no-more-text=""
                class="space-y-3 px-1 py-4"
                @load-more="loadMoreSubscriptions"
            >
                <UCard
                    v-for="subscription in subscriptions"
                    :key="subscription.id"
                    variant="subtle"
                    class="rounded-lg"
                >
                    <div class="mb-3 flex flex-row items-center justify-between text-lg">
                        <div class="flex flex-row items-center gap-1.5">
                            <UAvatar
                                :src="subscription.level?.icon"
                                :alt="subscription.level?.name"
                                size="lg"
                            />
                            <span class="font-medium">{{ subscription.level?.name || "-" }}</span>
                        </div>
                        <div class="text-right">
                            <div class="font-medium">{{ subscription.duration || "-" }}</div>
                            <UBadge v-if="subscription.isActive" color="success" size="sm">
                                {{ t("membership.frontend.center.active") }}
                            </UBadge>
                            <UBadge v-else-if="subscription.isExpired" color="error" size="sm">
                                {{ t("membership.frontend.center.expired") }}
                            </UBadge>
                        </div>
                    </div>
                    <div class="space-y-1">
                        <div class="text-sm">
                            <span class="text-secondary-foreground font-medium">
                                {{ t("membership.frontend.center.expireTime") }}：
                            </span>
                            <span class="text-muted">{{
                                formatDateTime(subscription.endTime, "date")
                            }}</span>
                        </div>
                        <div class="text-sm">
                            <span class="text-secondary-foreground font-medium">
                                {{ t("membership.frontend.center.startTime") }}：
                            </span>
                            <span class="text-muted">{{
                                formatDateTime(subscription.createdAt)
                            }}</span>
                        </div>
                        <div class="text-sm">
                            <span class="text-secondary-foreground font-medium">
                                {{ t("membership.frontend.center.source") }}：
                            </span>
                            <span class="text-muted">{{ subscription.sourceDesc }}</span>
                        </div>
                    </div>
                </UCard>
            </BdInfiniteScroll>
        </BdScrollArea>
    </BdModal>
</template>
