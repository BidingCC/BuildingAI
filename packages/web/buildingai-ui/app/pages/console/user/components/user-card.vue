<script setup lang="ts">
import type { UserInfo } from "@buildingai/service/webapi/user";

const emit = defineEmits<{
    (e: "select", user: UserInfo, selected: boolean | "indeterminate"): void;
    (e: "delete", user: UserInfo): void;
    (e: "edit-power", user: UserInfo): void;
    (e: "adjust-membership", user: UserInfo): void;
}>();

const props = withDefaults(
    defineProps<{
        user: UserInfo;
        selected?: boolean;
    }>(),
    {
        selected: false,
    },
);

const router = useRouter();
const { t } = useI18n();
const { hasAccessByCodes } = useAccessControl();
const auth = useUserStore();

function handleSelect(selected: boolean | "indeterminate") {
    if (typeof selected === "boolean") {
        emit("select", props.user, selected);
    }
}

function getUserStatusInfo(status: number | undefined) {
    switch (status) {
        case 1:
            return {
                label: t("user.backend.status.active"),
                color: "success" as const,
                icon: "i-lucide-check-circle",
            };
        case 0:
            return {
                label: t("user.backend.status.inactive"),
                color: "error" as const,
                icon: "i-lucide-x-circle",
            };
        default:
            return {
                label: t("user.backend.status.unknown"),
                color: "warning" as const,
                icon: "i-lucide-help-circle",
            };
    }
}

function getUserSourceInfo(source: number | undefined) {
    switch (source) {
        case 0: // CONSOLE - 管理员新增
            return {
                label: t("user.backend.source.console"),
                icon: "i-lucide-user-plus",
            };
        case 1: // PHONE - 手机号注册
            return {
                label: t("user.backend.source.phone"),
                icon: "i-lucide-smartphone",
            };
        case 2: // WECHAT - 微信注册
            return {
                label: t("user.backend.source.wechat"),
                icon: "i-lucide-message-circle",
            };
        case 3: // EMAIL - 邮箱注册
            return {
                label: t("user.backend.source.email"),
                icon: "i-lucide-mail",
            };
        case 4: // USERNAME - 账号注册
            return {
                label: t("user.backend.source.username"),
                icon: "i-lucide-user-check",
            };
        default:
            return {
                label: t("user.backend.source.unknown"),
                icon: "i-lucide-help-circle",
            };
    }
}

const dropdownActions = computed(() => {
    const items = [];

    if (
        hasAccessByCodes(["users:update"]) &&
        (props.user.isRoot !== 1 ||
            (auth.userInfo?.isRoot === 1 && props.user.id === auth.userInfo.id))
    ) {
        items.push({
            label: t("user.backend.editProfile"),
            icon: "i-lucide-user-round-pen",
            onSelect: () =>
                router.push({
                    path: useRoutePath("users:update"),
                    query: { id: props.user.id },
                }),
        });
        items.push({
            label: t("user.backend.adjustBalance"),
            icon: "i-lucide-edit",
            onSelect: () => emit("edit-power", props.user),
        });
        items.push({
            label: t("user.backend.membership.adjustMembership"),
            icon: "i-lucide-edit",
            onSelect: () => emit("adjust-membership", props.user),
        });
    }

    if (hasAccessByCodes(["users:delete"]) && props.user.isRoot !== 1) {
        items.push({
            label: t("user.backend.deleteUser"),
            icon: "i-lucide-trash-2",
            color: "error" as const,
            onSelect: () => emit("delete", props.user),
        });
    }

    return items;
});

const statusInfo = computed(() => getUserStatusInfo(props.user.status));
const sourceInfo = computed(() => getUserSourceInfo(props.user.source));

function handleCardClick() {
    console.log("handleCardClick", props.user);
    if (
        hasAccessByCodes(["users:update"]) &&
        (props.user.isRoot !== 1 ||
            (auth.userInfo?.isRoot === 1 && props.user.id === auth.userInfo.id))
    ) {
        router.push({
            path: useRoutePath("users:update"),
            query: { id: props.user.id },
        });
    }
}
</script>

<template>
    <BdCard
        :selectable="props.user.isRoot !== 1"
        show-actions
        variant="outlined"
        :selected="selected"
        :actions="dropdownActions"
        :clickable="true"
        @select="handleSelect"
        @click="handleCardClick"
    >
        <template #icon="{ groupHoverClass, selectedClass }">
            <UChip position="top-right" color="success">
                <UAvatar
                    :src="user.avatar"
                    :alt="user.nickname || user.username"
                    size="3xl"
                    :ui="{ root: 'rounded-lg', fallback: 'text-inverted' }"
                    :class="[groupHoverClass, selectedClass, user.avatar ? '' : 'bg-primary']"
                />
            </UChip>
        </template>

        <template #title>
            <!-- 用户名称 -->
            <h3 class="text-secondary-foreground flex items-center text-base font-semibold">
                <UTooltip :text="user.nickname" :delay="0">
                    <span class="line-clamp-1">
                        {{ user.nickname }}
                    </span>
                </UTooltip>
                <span class="text-muted-foreground mr-2 text-sm">(@{{ user.username }})</span>
                <!-- 用户权限 -->
                <UBadge v-if="user.isRoot" color="warning" size="sm" class="ml-auto shrink-0">
                    {{ $t("user.backend.admin") }}
                </UBadge>
                <UBadge v-else-if="user.role" color="primary" size="sm" class="ml-auto shrink-0">
                    {{ user.role.name }}
                </UBadge>
            </h3>
        </template>

        <template #description>
            <!-- 用户编号 -->
            <h4 class="text-muted-foreground text-xs">
                {{ $t("user.backend.userNo") }}: {{ user.userNo || t("user.backend.notSet") }}
            </h4>
        </template>

        <template #details>
            <div class="border-default border-t border-dashed pt-4 text-center text-xs">
                <!-- 详细信息网格 -->
                <div class="grid grid-cols-2 gap-2 gap-y-3 text-left">
                    <!-- 用户状态 -->
                    <div class="flex items-center gap-2">
                        <UIcon :name="statusInfo.icon" class="text-muted-foreground size-3" />
                        <span class="text-muted-foreground">{{ statusInfo.label }}</span>
                    </div>

                    <!-- 用户来源 -->
                    <div class="flex items-center gap-2">
                        <UIcon :name="sourceInfo.icon" class="text-muted-foreground size-3" />
                        <span v-if="user.isRoot === 1" class="text-muted-foreground"> - </span>
                        <span v-else class="text-muted-foreground">{{ sourceInfo.label }}</span>
                    </div>

                    <!-- 创建时间 -->
                    <div class="flex items-center gap-2">
                        <UIcon name="i-lucide-clock" class="text-muted-foreground size-3" />
                        <span class="text-muted-foreground">
                            <TimeDisplay :datetime="user.createdAt" mode="date" />
                        </span>
                    </div>

                    <!-- 最后登录时间 -->
                    <div class="flex items-center gap-2">
                        <UIcon name="i-lucide-clock-alert" class="text-muted-foreground size-3" />
                        <span class="text-muted-foreground">
                            <TimeDisplay
                                v-if="user.lastLoginAt"
                                :datetime="user.lastLoginAt"
                                mode="date"
                            />
                            <span v-else>{{ t("user.backend.neverLogin") }}</span>
                        </span>
                    </div>
                </div>
            </div>
        </template>
    </BdCard>
</template>
