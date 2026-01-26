<script lang="ts" setup>
import type { UserInfo } from "@buildingai/service/webapi/user";
import type { TableColumn } from "@nuxt/ui";
import { h, nextTick, ref, resolveComponent, watch } from "vue";
import { useI18n } from "vue-i18n";

interface UserListProps {
    usersList: UserInfo[];
    selectedUsers: Set<string>;
}

const { t } = useI18n();
const { hasAccessByCodes } = useAccessControl();
const router = useRouter();

const props = withDefaults(defineProps<UserListProps>(), {
    usersList: () => [],
    selectedUsers: () => new Set(),
});

const emit = defineEmits<{
    "update:selectedUsers": [selectedUsers: Set<string>];
    delete: [user: UserInfo];
    editPower: [user: UserInfo];
    adjustMembership: [user: UserInfo];
}>();

const UAvatar = resolveComponent("UAvatar");
const TimeDisplay = resolveComponent("TimeDisplay");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");
const UCheckbox = resolveComponent("UCheckbox");

const table = useTemplateRef("table");

const columnLabels = computed<Record<string, string>>(() => {
    return {
        userNo: t("user.backend.list.userNo"),
        username: t("user.backend.list.username"),
        nickname: t("user.backend.list.nickname"),
        status: t("user.backend.list.status"),
        source: t("user.backend.list.source"),
        createdAt: t("user.backend.list.registerTime"),
        lastLoginAt: t("user.backend.list.lastLoginAt"),
        actions: t("user.backend.list.actions"),
        membershipLevel: t("user.backend.list.level"),
        endTime: t("user.backend.list.endTime"),
    };
});

/** 获取用户来源信息 */
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

/** 获取用户状态信息 */
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

const handleSelectAll = (value: boolean | "indeterminate") => {
    const isSelected = value === true;
    const next = new Set(props.selectedUsers);
    if (isSelected) {
        // 只选中非超级管理员用户
        props.usersList.forEach((user: UserInfo) => {
            if (user.isRoot !== 1) {
                next.add(user.id);
            }
        });
    } else {
        props.usersList.forEach((user: UserInfo) => {
            next.delete(user.id);
        });
    }
    emit("update:selectedUsers", next);
    // 手动更新表格的行选中状态，只更新可选择的行
    nextTick(() => {
        if (table.value?.tableApi) {
            const rowModel = table.value.tableApi.getRowModel();
            if (rowModel) {
                rowModel.rows.forEach((row) => {
                    const user = row.original;
                    if (user.isRoot !== 1) {
                        row.toggleSelected(isSelected);
                    }
                });
            }
        }
    });
};

const handleConversationSelect = (user: UserInfo, selected: boolean | "indeterminate") => {
    // 超级管理员不允许选择
    if (user.isRoot === 1) return;

    if (typeof selected === "boolean") {
        const userId = user.id;
        const next = new Set(props.selectedUsers);
        if (selected) {
            next.add(userId);
        } else {
            next.delete(userId);
        }
        emit("update:selectedUsers", next);
    }
};

const columns = ref<TableColumn<UserInfo>[]>([
    {
        id: "select",
        header: () => {
            // 计算可选择的用户（非超级管理员）
            const selectableUsers = props.usersList.filter((user) => user.isRoot !== 1);
            const selectedCount = selectableUsers.filter((user) =>
                props.selectedUsers.has(user.id),
            ).length;
            const isAllSelected =
                selectableUsers.length > 0 && selectedCount === selectableUsers.length;
            const isIndeterminate = selectedCount > 0 && selectedCount < selectableUsers.length;

            return h(UCheckbox, {
                modelValue: isIndeterminate ? "indeterminate" : isAllSelected,
                "onUpdate:modelValue": (value: boolean | "indeterminate") => {
                    // 直接调用 handleSelectAll，它会处理表格状态和 selectedUsers 的更新
                    handleSelectAll(value);
                },
                "aria-label": "Select all",
            });
        },
        cell: ({ row }) => {
            const isRoot = row.original.isRoot === 1;
            return h(UCheckbox, {
                modelValue: row.getIsSelected(),
                disabled: isRoot,
                "onUpdate:modelValue": (value: boolean | "indeterminate") => {
                    if (isRoot) return; // 超级管理员不允许选择
                    row.toggleSelected(!!value);
                    handleConversationSelect(row.original, value);
                },
                "aria-label": "Select row",
            });
        },
    },
    {
        accessorKey: "userNo",
        header: columnLabels.value.userNo,
    },
    {
        accessorKey: "nickname",
        header: columnLabels.value.nickname,
        cell: ({ row }) =>
            h("div", { class: "flex items-center gap-2" }, [
                h(UAvatar, { src: row.original.avatar }),
                row.original.nickname,
            ]),
    },
    {
        accessorKey: "username",
        header: columnLabels.value.username,
    },
    {
        accessorKey: "source",
        header: columnLabels.value.source,
        cell: ({ row }) => getUserSourceInfo(row.original.source).label,
    },
    {
        accessorKey: "membershipLevel",
        header: columnLabels.value.membershipLevel,
        cell: ({ row }) => {
            const membershipLevel = row.original.membershipLevel;
            if (!membershipLevel) {
                return h("span", "-");
            }
            return h("span", membershipLevel.name);
        },
    },
    {
        accessorKey: "endTime",
        header: columnLabels.value.endTime,
        cell: ({ row }) => {
            const endTime = row.original.membershipLevel?.endTime;
            if (!endTime) {
                return h("span", "-");
            }
            const endDate = new Date(endTime);
            const now = new Date();
            return h("span", { class: "flex items-center flex-col gap-2" }, [
                h(TimeDisplay, { datetime: endTime, mode: "datetime" }),
                endDate > now ? "" : h(UBadge, { color: "error" }, t("user.backend.expired")),
            ]);
        },
    },
    {
        accessorKey: "status",
        header: columnLabels.value.status,
        cell: ({ row }) => getUserStatusInfo(row.original.status).label,
    },
    {
        accessorKey: "createdAt",
        header: columnLabels.value.createdAt,
        cell: ({ row }) => {
            const createdAt = row.getValue("createdAt") as string;
            return h(
                "span",
                createdAt ? h(TimeDisplay, { datetime: createdAt, mode: "datetime" }) : "-",
            );
        },
    },
    {
        accessorKey: "lastLoginAt",
        header: columnLabels.value.lastLoginAt,
        cell: ({ row }) => {
            const lastLoginAt = row.getValue("lastLoginAt") as string;
            return h(
                "span",
                lastLoginAt
                    ? h(TimeDisplay, { datetime: lastLoginAt, mode: "datetime" })
                    : t("user.backend.neverLogin"),
            );
        },
    },
    {
        accessorKey: "actions",
        header: columnLabels.value.actions,
        cell: ({ row }) => {
            return h(UDropdownMenu, { items: getRowItems(row.original) }, () => {
                return h(
                    UButton,
                    {
                        icon: "i-lucide-ellipsis-vertical",
                        color: "neutral",
                        variant: "ghost",
                        class: "ml-auto",
                    },
                    () => "",
                );
            });
        },
    },
]);

function getRowItems(user: UserInfo) {
    const items = [];

    if (hasAccessByCodes(["users:update"])) {
        items.push({
            label: t("user.backend.editProfile"),
            icon: "i-lucide-edit",
            onSelect: () =>
                router.push({
                    path: useRoutePath("users:update"),
                    query: { id: user.id },
                }),
        });
        items.push({
            label: t("user.backend.adjustBalance"),
            icon: "i-lucide-edit",
            onSelect: () => emit("editPower", user),
        });
        items.push({
            label: t("user.backend.membership.adjustMembership"),
            icon: "i-lucide-edit",
            onSelect: () => emit("adjustMembership", user),
        });
    }

    if (hasAccessByCodes(["users:delete"]) && user.isRoot !== 1) {
        items.push({
            label: t("user.backend.deleteUser"),
            icon: "i-lucide-trash-2",
            color: "error" as const,
            onSelect: () => emit("delete", user),
        });
    }

    // if (hasAccessByCodes(["users:delete"])) {
    //     items.push({
    //         label: t("console-common.delete"),
    //         icon: "i-lucide-trash-2",
    //         color: "error" as const,
    //         onSelect: () => emit("delete", props.user),
    //     });
    // }

    return items;
}

// 列固定
const columnPinning = ref({
    left: [""],
    right: ["actions"],
});

// 同步 selectedUsers 到表格的行选中状态
// 使用 computed 来监听 Set 的变化
const selectedUsersArray = computed(() => Array.from(props.selectedUsers));

watch(
    selectedUsersArray,
    (newSelectedUsersArray) => {
        if (!table.value?.tableApi) return;

        const newSelectedUsers = new Set(newSelectedUsersArray);
        nextTick(() => {
            // 获取所有行
            const rowModel = table.value?.tableApi.getRowModel();
            if (!rowModel) return;

            // 遍历所有行，根据 selectedUsers 更新选中状态
            rowModel.rows.forEach((row) => {
                const userId = row.original.id;
                const shouldBeSelected = newSelectedUsers.has(userId);
                const isCurrentlySelected = row.getIsSelected();

                // 只更新状态不一致的行，避免循环触发
                if (shouldBeSelected !== isCurrentlySelected) {
                    row.toggleSelected(shouldBeSelected);
                }
            });
        });
    },
    { immediate: true },
);
</script>
<template>
    <UTable
        ref="table"
        :data="props.usersList"
        :columns="columns"
        :column-pinning="columnPinning"
        :ui="{
            base: 'table-fixed border-separate border-spacing-0',
            thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
            tbody: '[&>tr]:last:[&>td]:border-b-0',
            th: 'py-2 whitespace-nowrap first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
            td: 'border-b border-default',
            tr: '[&:has(>td[colspan])]:hidden',
        }"
    >
    </UTable>
</template>
