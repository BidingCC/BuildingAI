<script lang="tsx" setup>
import type {
    QueryTeamMemberParams,
    TeamMember,
    TeamRole,
} from "@buildingai/service/consoleapi/ai-datasets";
import {
    apiGetTeamMembers,
    apiRemoveTeamMember,
    apiTransferOwnership,
    apiUpdateTeamMemberRole,
} from "@buildingai/service/consoleapi/ai-datasets";
import { type Row } from "@tanstack/table-core";

import type { TableColumn } from "#ui/types";

const AddMemberModal = defineAsyncComponent(() => import("../components/member/add.vue"));

const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UInput = resolveComponent("UInput");
const UAvatar = resolveComponent("UAvatar");
const UPopover = resolveComponent("UPopover");
const UIcon = resolveComponent("UIcon");

const { params: URLQueryParams } = useRoute();
const router = useRouter();
const toast = useMessage();
const { t } = useI18n();
const table = useTemplateRef("table");
const overlay = useOverlay();

const datasetId = computed(() => (URLQueryParams as Record<string, string>).id);

const searchForm = shallowReactive<QueryTeamMemberParams>({
    datasetId: datasetId.value || "",
    username: "",
    role: undefined,
    isActive: undefined,
});

const columnLabels = computed(() => ({
    user: t("ai-datasets.backend.members.table.user"),
    role: t("ai-datasets.backend.members.table.role"),
    status: t("console-common.status"),
    createdAt: t("ai-datasets.backend.members.table.createdAt"),
    lastActiveAt: t("ai-datasets.backend.members.table.lastActiveAt"),
    actions: t("console-common.operation"),
}));

const { paging, getLists } = usePaging<TeamMember>({
    fetchFun: apiGetTeamMembers,
    params: searchForm,
});

const mySelf = computed(() => paging.items.find((item) => item.oneself));

const roleMap = {
    owner: { label: t("ai-datasets.backend.members.role.owner"), color: "error" as const },
    manager: { label: t("ai-datasets.backend.members.role.manager"), color: "warning" as const },
    editor: { label: t("ai-datasets.backend.members.role.editor"), color: "primary" as const },
    viewer: { label: t("ai-datasets.backend.members.role.viewer"), color: "neutral" as const },
};

const columns: TableColumn<TeamMember>[] = [
    {
        accessorKey: "user",
        header: () => h("p", { class: "" }, `${columnLabels.value.user}`),
        cell: ({ row }) => {
            return h("div", { class: "flex items-center gap-3" }, [
                h(UAvatar, {
                    src: row.original.user?.avatar,
                    alt: row.original.user?.username || row.original.userId,
                    size: "sm",
                }),
                h("div", undefined, [
                    h("div", { class: "flex items-center gap-2" }, [
                        h(
                            "p",
                            { class: "font-medium text-highlighted" },
                            row.original.user?.nickname ||
                                row.original.user?.username ||
                                row.original.userId,
                        ),
                        row.original.oneself
                            ? h(UBadge, { color: "primary", variant: "subtle", size: "xs" }, () =>
                                  t("ai-datasets.backend.members.self"),
                              )
                            : null,
                    ]),
                    row.original.user?.username
                        ? h(
                              "p",
                              { class: "text-sm text-muted-foreground truncate max-w-xs" },
                              row.original.user.username,
                          )
                        : null,
                    row.original.note
                        ? h(
                              "p",
                              { class: "text-sm text-muted-foreground mt-1" },
                              `${t("ai-datasets.backend.members.note")}: ${row.original.note}`,
                          )
                        : null,
                ]),
            ]);
        },
    },
    {
        accessorKey: "role",
        header: () => {
            return h("div", { class: "flex items-center gap-2" }, [
                h("p", { class: "" }, `${columnLabels.value.role}`),
                h(
                    UPopover,
                    {
                        mode: "hover",
                        openDelay: 200,
                        content: {
                            align: "start",
                            side: "bottom",
                            sideOffset: 8,
                        },
                    },
                    {
                        default: () =>
                            h(UIcon, {
                                name: "i-lucide-info",
                                class: "text-muted-foreground size-4 cursor-help",
                            }),
                        content: () =>
                            h("div", { class: "w-80 space-y-3 p-4" }, [
                                h(
                                    "h3",
                                    { class: "text-sm font-semibold mb-3" },
                                    t("ai-datasets.backend.members.rolePermissionDescription"),
                                ),
                                h("ul", { class: "space-y-2.5 text-sm" }, [
                                    h("li", { class: "flex flex-col gap-1" }, [
                                        h(
                                            "span",
                                            { class: "font-medium" },
                                            `${t("ai-datasets.backend.members.role.owner")}:`,
                                        ),
                                        h(
                                            "span",
                                            { class: "text-muted-foreground" },
                                            t("ai-datasets.backend.members.roleOwnerDescription"),
                                        ),
                                    ]),
                                    h("li", { class: "flex flex-col gap-1" }, [
                                        h(
                                            "span",
                                            { class: "font-medium" },
                                            `${t("ai-datasets.backend.members.role.manager")}:`,
                                        ),
                                        h(
                                            "span",
                                            { class: "text-muted-foreground" },
                                            t("ai-datasets.backend.members.roleManagerDescription"),
                                        ),
                                    ]),
                                    h("li", { class: "flex flex-col gap-1" }, [
                                        h(
                                            "span",
                                            { class: "font-medium" },
                                            `${t("ai-datasets.backend.members.role.editor")}:`,
                                        ),
                                        h(
                                            "span",
                                            { class: "text-muted-foreground" },
                                            t("ai-datasets.backend.members.roleEditorDescription"),
                                        ),
                                    ]),
                                    h("li", { class: "flex flex-col gap-1" }, [
                                        h(
                                            "span",
                                            { class: "font-medium" },
                                            `${t("ai-datasets.backend.members.role.viewer")}:`,
                                        ),
                                        h(
                                            "span",
                                            { class: "text-muted-foreground" },
                                            t("ai-datasets.backend.members.roleViewerDescription"),
                                        ),
                                    ]),
                                ]),
                            ]),
                    },
                ),
            ]);
        },
        cell: ({ row }) => {
            const role = row.getValue("role") as keyof typeof roleMap;
            const roleInfo = roleMap[role];
            return h(UBadge, { color: roleInfo.color, variant: "subtle" }, () => roleInfo.label);
        },
    },
    {
        accessorKey: "createdAt",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();

            return h(UButton, {
                color: "neutral",
                variant: "ghost",
                label: columnLabels.value.createdAt,
                icon: isSorted
                    ? isSorted === "asc"
                        ? "i-lucide-arrow-up-narrow-wide"
                        : "i-lucide-arrow-down-wide-narrow"
                    : "i-lucide-arrow-up-down",
                class: "-mx-2.5",
                onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
            });
        },
        cell: ({ row }) => {
            const createdAt = row.getValue("createdAt") as string;
            return h("span", { class: "text-sm" }, new Date(createdAt).toLocaleDateString());
        },
    },
    {
        accessorKey: "lastActiveAt",
        header: () => h("p", { class: "" }, `${columnLabels.value.lastActiveAt}`),
        cell: ({ row }) => {
            const lastActiveAt = row.getValue("lastActiveAt") as string | null;
            return h(
                "span",
                { class: "text-sm text-muted-foreground" },
                lastActiveAt ? new Date(lastActiveAt).toLocaleDateString() : "-",
            );
        },
    },
    {
        id: "actions",
        header: () => h("p", { class: "" }, `${columnLabels.value.actions}`),
        size: 80,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
            const items = getRowItems(row);
            if (items.length === 0) {
                return null;
            }

            return h(UDropdownMenu, { items }, () => {
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
];

function getRowItems(row: Row<TeamMember>) {
    return [
        row.original.isCurrentUserOwner && row.original.role !== "owner"
            ? {
                  label: t("ai-datasets.backend.members.transferOwnership"),
                  icon: "i-lucide-crown",
                  onClick: () => {
                      handleTransferOwnership(row.original);
                  },
              }
            : null,
        row.original.canOperate && !row.original.oneself
            ? {
                  label: t("ai-datasets.backend.members.updateRole"),
                  icon: "i-lucide-pen-line",
                  onClick: () => {
                      handleUpdateRole(row.original);
                  },
              }
            : null,
        row.original.canOperate
            ? {
                  label: !row.original.oneself
                      ? t("ai-datasets.backend.members.removeMember")
                      : t("ai-datasets.backend.members.exit"),
                  icon: !row.original.oneself ? "i-lucide-trash" : "i-lucide-log-out",
                  color: "error",
                  onSelect() {
                      handleRemoveMember(row);
                  },
              }
            : null,
    ].filter(Boolean);
}

watch(
    () => [searchForm.username, searchForm.role, searchForm.isActive],
    () => {
        useDebounceFn(() => {
            paging.page = 1;
            getLists();
        }, 300)();
    },
    { deep: true },
);

const handleAddMember = async () => {
    const modal = overlay.create(AddMemberModal);

    const instance = modal.open({
        modelValue: true,
        datasetId: datasetId.value || "",
    });
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        getLists();
    }
};

const handleUpdateRole = async (member: TeamMember) => {
    try {
        const newRole = ref(member.role);
        const newNote = ref(member.note || "");

        const roleOptions = [
            { label: t("ai-datasets.backend.members.role.manager"), value: "manager" },
            { label: t("ai-datasets.backend.members.role.editor"), value: "editor" },
            { label: t("ai-datasets.backend.members.role.viewer"), value: "viewer" },
        ];

        const UpdateRoleForm = markRaw({
            setup() {
                return () =>
                    h("div", { class: "space-y-4" }, [
                        h("div", { class: "text-sm text-gray-600 mb-3" }, [
                            t("console-common.update"),
                            h(
                                "span",
                                { class: "text-red-500" },
                                member.user?.username || member.userId,
                            ),
                            t("ai-datasets.backend.members.roleTip"),
                        ]),
                        h("div", {}, [
                            h(
                                "label",
                                { class: "block text-sm font-medium mb-2" },
                                `${t("ai-datasets.backend.members.newRole")}:`,
                            ),
                            h(resolveComponent("USelectMenu"), {
                                modelValue: newRole.value,
                                "onUpdate:modelValue": (value: TeamRole) => (newRole.value = value),
                                items: roleOptions,
                                labelKey: "label",
                                valueKey: "value",
                                class: "w-full",
                            }),
                        ]),
                        h("div", {}, [
                            h(
                                "label",
                                { class: "block text-sm font-medium mb-2" },
                                `${t("ai-datasets.backend.members.note")}:`,
                            ),
                            h(resolveComponent("UTextarea"), {
                                modelValue: newNote.value,
                                "onUpdate:modelValue": (value: string) => (newNote.value = value),
                                placeholder: t("ai-datasets.backend.members.notePlaceholder"),
                                class: "w-full",
                                rows: 3,
                            }),
                        ]),
                    ]);
            },
        });

        await useModal({
            title: t("ai-datasets.backend.members.updateRoleModal"),
            content: UpdateRoleForm,
            confirmText: t("console-common.update"),
            cancelText: t("console-common.cancel"),
            ui: { content: "!w-md" },
        });

        if (newRole.value !== member.role || newNote.value !== (member.note || "")) {
            await apiUpdateTeamMemberRole({
                memberId: member.id,
                role: newRole.value,
                note: newNote.value || undefined,
            });
            toast.success(t("ai-datasets.backend.members.updateRoleSuccess"));
            getLists();
        }
    } catch (error) {
        console.error("更新角色失败:", error);
    }
};

const handleRemoveMember = async (row: Row<TeamMember>) => {
    try {
        await useModal({
            color: "error",
            title: row.original.oneself
                ? t("ai-datasets.backend.members.confirmExit")
                : t("ai-datasets.backend.members.confirmRemove"),
            content: row.original.oneself
                ? t("ai-datasets.backend.members.confirmExitContent")
                : t("ai-datasets.backend.members.confirmRemoveContent"),
            confirmText: row.original.oneself
                ? t("console-common.exit")
                : t("console-common.remove"),
            ui: { content: "!w-sm" },
        });

        await apiRemoveTeamMember({ memberId: row.original.id });
        if (row.original.oneself) {
            router.push(useRoutePath("ai-datasets:list"));
            toast.success(t("ai-datasets.backend.members.exitSuccess"));
            return;
        }
        toast.success(t("ai-datasets.backend.members.removeSuccess"));
        getLists();
    } catch (error) {
        console.error("移除失败:", error);
    }
};

const handleTransferOwnership = async (member: TeamMember) => {
    try {
        await useModal({
            color: "warning",
            title: t("ai-datasets.backend.members.transferOwnership"),
            content: h("div", { class: "text-sm text-gray-600" }, [
                h("p", { class: "mb-2" }, [
                    t("ai-datasets.backend.members.confirmTransferContent"),
                    h("span", { class: "text-red-500" }, member.user?.username || member.userId),
                    " ？",
                ]),
                h(
                    "p",
                    { class: "text-red-500" },
                    t("ai-datasets.backend.members.confirmTransferContent2"),
                ),
            ]),
            confirmText: t("ai-datasets.backend.members.confirmTransfer"),
            ui: { content: "!w-sm" },
        });

        await apiTransferOwnership({
            datasetId: datasetId.value || "",
            newOwnerId: member.userId,
        });
        toast.success(t("ai-datasets.backend.members.confirmTransferSuccess"));
        getLists();
    } catch (error) {
        console.error("转移所有权失败:", error);
    }
};

onMounted(() => getLists());

definePageMeta({ layout: "full-screen" });
</script>

<template>
    <div class="flex h-full w-full flex-col px-6">
        <div class="flex flex-col justify-center gap-1 pt-4">
            <h1 class="text-lg! font-bold">{{ t("ai-datasets.backend.members.title") }}</h1>
            <p class="text-muted-foreground text-sm">
                {{ t("ai-datasets.backend.members.description") }}
            </p>
        </div>

        <!-- 搜索区域 -->
        <div class="flex w-full justify-between gap-4 py-6 backdrop-blur-sm">
            <UInput
                v-model="searchForm.username"
                :placeholder="$t('ai-datasets.backend.members.searchPlaceholder')"
                class="w-80"
                icon="i-lucide-search"
            />

            <div class="flex items-center gap-2 md:ml-auto">
                <UDropdownMenu
                    :items="
                        table?.tableApi
                            ?.getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => ({
                                label:
                                    columnLabels[column.id as keyof typeof columnLabels] ||
                                    column.columnDef.header,
                                type: 'checkbox' as const,
                                checked: column.getIsVisible(),
                                onUpdateChecked(checked: boolean) {
                                    table?.tableApi
                                        ?.getColumn(column.id)
                                        ?.toggleVisibility(!!checked);
                                },
                                onSelect(e?: Event) {
                                    e?.preventDefault();
                                },
                            }))
                    "
                    :content="{ align: 'end' }"
                >
                    <UButton
                        :label="$t('console-common.showColumns')"
                        color="neutral"
                        variant="outline"
                        trailing-icon="i-lucide-chevron-down"
                    />
                </UDropdownMenu>

                <UButton
                    :label="$t('ai-datasets.backend.members.addMember')"
                    :disabled="
                        !useUserStore().userInfo?.isRoot &&
                        !(mySelf?.role === 'owner') &&
                        !(mySelf?.role === 'manager')
                    "
                    leading-icon="i-lucide-plus"
                    color="primary"
                    @click="handleAddMember"
                />
            </div>
        </div>

        <!-- 表格区域 -->
        <UTable
            :loading="paging.loading"
            :data="paging.items"
            :columns="columns"
            class="shrink-0"
            ref="table"
            selectable
            :ui="{
                base: 'table-fixed border-separate border-spacing-0',
                thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                tbody: '[&>tr]:last:[&>td]:border-b-0',
                th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                td: 'border-b border-default',
                tr: 'hover:bg-elevated/50',
            }"
        />

        <!-- 分页 -->
        <div class="mt-auto flex items-center justify-end gap-3 py-4">
            <BdPagination
                v-model:page="paging.page"
                v-model:size="paging.pageSize"
                :total="paging.total"
                @change="getLists"
            />
        </div>
    </div>
</template>
