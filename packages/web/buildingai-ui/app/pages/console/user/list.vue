<script lang="ts" setup>
import {
    apiBatchDeleteUser,
    apiDeleteUser,
    apiGetUserList,
} from "@buildingai/service/consoleapi/user";
import type { UserInfo, UserQueryRequest } from "@buildingai/service/webapi/user";

const EditPower = defineAsyncComponent(() => import("./components/edit-power.vue"));
const AdjustMembership = defineAsyncComponent(() => import("./components/adjust-membership.vue"));
const UserCard = defineAsyncComponent(() => import("./components/user-card.vue"));
const UserList = defineAsyncComponent(() => import("./components/user-list.vue"));

const router = useRouter();
const toast = useMessage();
const { t } = useI18n();
const overlay = useOverlay();

const searchForm = shallowReactive<UserQueryRequest>({
    keyword: "",
    startTime: "",
    endTime: "",
});

const viewTab = ref(2);
const viewTabs = [
    { value: 2, icon: "i-tabler-list" },
    { value: 1, icon: "i-tabler-layout-grid" },
];

const selectedUsers = shallowRef<Set<string>>(new Set());

const { paging, getLists } = usePaging({
    fetchFun: apiGetUserList,
    params: searchForm,
});

const filteredUsers = computed(() => {
    return paging.items.filter((user: UserInfo) => user.isRoot !== 1);
});

const handleUserSelect = (user: UserInfo, selected: boolean | "indeterminate") => {
    if (typeof selected !== "boolean") return;

    const userId = user.id as string;
    const next = new Set(selectedUsers.value);

    if (selected) {
        next.add(userId);
    } else {
        next.delete(userId);
    }

    selectedUsers.value = next;
};

const handleSelectAll = (value: boolean | "indeterminate") => {
    const isSelected = value === true;
    const next = new Set(selectedUsers.value);

    if (isSelected) {
        filteredUsers.value.forEach((user: UserInfo) => {
            if (user.id) {
                next.add(user.id);
            }
        });
    } else {
        next.clear();
    }

    selectedUsers.value = next;
};

const handleSelectedUsersUpdate = (newSelectedUsers: Set<string>) => {
    selectedUsers.value = newSelectedUsers;
};

const handleDelete = async (id: number | string | number[] | string[]) => {
    try {
        await useModal({
            title: t("user.backend.deleteTitle"),
            description: t("user.backend.deleteMsg"),
            color: "error",
        });

        if (Array.isArray(id)) {
            await apiBatchDeleteUser(id.map(String));
        } else {
            await apiDeleteUser(String(id));
        }

        // 清空选中状态
        selectedUsers.value.clear();

        // 刷新列表
        getLists();
        toast.success(t("user.backend.success"));
    } catch (error) {
        console.error("Delete failed:", error);
    }
};

const handleDeleteUser = (user: UserInfo) => {
    if (user.id) {
        handleDelete(user.id);
    }
};

const mountEditPowerModal = async (user: UserInfo) => {
    const modal = overlay.create(EditPower);

    const instance = modal.open({
        user,
    });
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        getLists();
    }
};

const handleEditPower = (user: UserInfo) => {
    mountEditPowerModal(user);
};

const mountAdjustMembershipModal = async (user: UserInfo) => {
    const modal = overlay.create(AdjustMembership);

    const instance = modal.open({
        user,
    });
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        getLists();
    }
};

const handleAdjustMembership = (user: UserInfo) => {
    mountAdjustMembershipModal(user);
};

const handleBatchDelete = () => {
    const selectedIds = Array.from(selectedUsers.value);
    if (selectedIds.length === 0) return;
    handleDelete(selectedIds);
};

const isAllSelected = computed(() => {
    return (
        filteredUsers.value.length > 0 &&
        filteredUsers.value.every(
            (user: UserInfo) => user.id && selectedUsers.value.has(user.id as string),
        )
    );
});

const isIndeterminate = computed(() => {
    const selectedCount = paging.items.filter(
        (user: UserInfo) => user.id && selectedUsers.value.has(user.id as string),
    ).length;
    return selectedCount > 0 && selectedCount < paging.items.length;
});

onMounted(() => getLists());
</script>

<template>
    <div class="user-list-container pb-5">
        <!-- 搜索区域 -->
        <div class="bg-background sticky top-0 z-10 flex flex-wrap gap-4 pb-2">
            <UInput
                v-model="searchForm.keyword"
                :placeholder="t('user.backend.keywordInput')"
                class="w-80"
                @change="getLists"
            />

            <BdDateRangePicker
                v-model:start="searchForm.startTime"
                v-model:end="searchForm.endTime"
                :show-time="true"
                :ui="{ root: 'w-auto sm:w-xs' }"
                @change="getLists"
            />

            <div class="flex items-center gap-2 md:ml-auto">
                <!-- 全选控制 -->
                <div class="flex items-center gap-2">
                    <UCheckbox
                        :model-value="
                            isAllSelected ? true : isIndeterminate ? 'indeterminate' : false
                        "
                        @update:model-value="handleSelectAll"
                    />
                    <span class="text-accent-foreground text-sm">
                        {{ selectedUsers.size }} / {{ paging.items.length }}
                        {{ t("console-common.selected") }}
                    </span>
                </div>

                <AccessControl :codes="['users:batch-delete']">
                    <UButton
                        color="error"
                        variant="subtle"
                        :label="t('console-common.batchDelete')"
                        icon="i-heroicons-trash"
                        :disabled="selectedUsers.size === 0"
                        @click="handleBatchDelete"
                    >
                        <template #trailing>
                            <UKbd>{{ selectedUsers.size }}</UKbd>
                        </template>
                    </UButton>
                </AccessControl>

                <AccessControl :codes="['users:create']">
                    <UButton
                        icon="i-heroicons-plus"
                        color="primary"
                        @click="router.push(useRoutePath('users:create'))"
                    >
                        {{ t("user.backend.add") }}
                    </UButton>
                </AccessControl>

                <UTabs
                    v-model="viewTab"
                    :items="viewTabs"
                    size="xs"
                    :ui="{
                        root: 'gap-0',
                        indicator: 'bg-background dark:bg-primary',
                        leadingIcon: 'bg-black dark:bg-white',
                    }"
                ></UTabs>
            </div>
        </div>

        <!-- 卡片网格 -->
        <template v-if="!paging.loading && paging.items.length > 0">
            <BdScrollArea class="h-[calc(100vh-13rem)]" :shadow="false">
                <div
                    v-show="viewTab === 1"
                    class="grid grid-cols-1 gap-6 py-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                >
                    <UserCard
                        v-for="user in paging.items"
                        :key="user.id"
                        :user="user"
                        :selected="selectedUsers.has(user.id as string)"
                        @edit-power="handleEditPower"
                        @adjust-membership="handleAdjustMembership"
                        @select="handleUserSelect"
                        @delete="handleDeleteUser"
                    />
                </div>
                <!-- 表格 -->
                <UserList
                    v-show="viewTab === 2"
                    :usersList="paging.items"
                    :selected-users="selectedUsers"
                    @update:selected-users="handleSelectedUsersUpdate"
                    @delete="handleDeleteUser"
                    @edit-power="handleEditPower"
                    @adjust-membership="handleAdjustMembership"
                />
            </BdScrollArea>
        </template>

        <!-- 加载状态 -->
        <div
            v-else-if="paging.loading"
            class="flex h-[calc(100vh-10rem)] items-center justify-center"
        >
            <div class="flex items-center gap-3">
                <UIcon name="i-lucide-loader-2" class="text-primary-500 h-6 w-6 animate-spin" />
                <span class="text-accent-foreground">{{ $t("common.loading") }}</span>
            </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="flex h-[calc(100vh-10rem)] flex-col items-center justify-center">
            <UIcon name="i-lucide-users" class="text-muted-foreground mb-4 h-16 w-16" />

            <p class="text-accent-foreground">
                {{ $t("user.backend.noUsers") }}
            </p>
        </div>

        <!-- 分页 -->
        <div
            v-if="paging.total > 0"
            class="bg-background sticky bottom-0 z-10 flex items-center justify-between gap-3 py-4"
        >
            <div class="text-muted text-sm">
                <!-- {{ selectedUsers.size }} {{ $t("console-common.selected") }} /  -->
                {{ $t("console-common.total") }} {{ paging.total }} {{ $t("console-common.items") }}
            </div>

            <div class="flex items-center gap-1.5">
                <BdPagination
                    v-model:page="paging.page"
                    v-model:size="paging.pageSize"
                    :total="paging.total"
                    @change="getLists"
                />
            </div>
        </div>
    </div>
</template>
