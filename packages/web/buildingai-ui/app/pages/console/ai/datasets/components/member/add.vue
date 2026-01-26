<script setup lang="ts">
import type { TeamRole } from "@buildingai/service/consoleapi/ai-datasets";
import { apiBatchAddTeamMembers } from "@buildingai/service/consoleapi/ai-datasets";
import type { UserInfo } from "@buildingai/service/webapi/user";
import { apiSearchUsers } from "@buildingai/service/webapi/user";

const props = defineProps<{
    modelValue: boolean;
    datasetId: string;
}>();

const emits = defineEmits<{
    (e: "update:modelValue", value: boolean): void;
    (e: "close", refresh?: boolean): void;
}>();

const { t } = useI18n();
const toast = useMessage();

// 表单数据
const formData = shallowReactive({
    note: "",
});
// 用户角色状态管理（独立于选择状态）
const userRoles = shallowRef<Record<string, TeamRole>>({});

const searchResults = shallowRef<
    {
        id: string;
        label: string;
        role: TeamRole;
        suffix: string;
        avatar: { src: string; alt: string };
    }[]
>([]);
const selectedUsers = shallowRef<UserInfo[]>([]);
const searchValue = shallowRef<string>("");
const searchValueDebounced = refDebounced(searchValue, 200);

const roleOptions = [
    { label: t("ai-datasets.backend.members.role.manager"), value: "manager" },
    { label: t("ai-datasets.backend.members.role.editor"), value: "editor" },
    { label: t("ai-datasets.backend.members.role.viewer"), value: "viewer" },
];

// 搜索用户函数
const searchUsers = async (keyword: string) => {
    if (!keyword.trim()) {
        searchResults.value = [];
    }
    try {
        const users = await apiSearchUsers({
            keyword: keyword.trim(),
            datasetId: props.datasetId,
            limit: 20,
        });
        searchResults.value = users.map((user) => ({
            id: user.id,
            label: user.nickname || user.username,
            role: "viewer" as TeamRole,
            suffix: user.username,
            avatar: {
                src: user.avatar || "",
                alt: user.username,
            },
        }));
    } catch (_error) {
        searchResults.value = [];
    }
};

// 动态分组，label根据搜索词变化
const groups = computed(() => [
    {
        id: "users",
        label: searchValue.value
            ? `${t("ai-datasets.backend.members.addModal.userMatch")} "${searchValue.value}"...`
            : t("ai-datasets.backend.members.addModal.user"),
        items: searchResults.value,
        ignoreFilter: true,
    },
]);

// 重置表单
const resetForm = () => {
    selectedUsers.value = [];
    userRoles.value = {};
    formData.note = "";
    searchResults.value = [];
    searchValue.value = "";
};

// 提交表单
const { lockFn: submitForm, isLock } = useLockFn(async () => {
    try {
        if (selectedUsers.value.length === 0) {
            toast.error(t("ai-datasets.backend.members.addModal.selectUserError"));
            return;
        }

        // 去重并使用角色状态
        const uniqueUserIds = [...new Set(selectedUsers.value.map((user) => user.id))];

        const members = uniqueUserIds.map((userId) => ({
            userId,
            role: userRoles.value[userId] || "viewer",
            note: formData.note || undefined,
        }));

        await apiBatchAddTeamMembers({
            datasetId: props.datasetId,
            members,
        });

        toast.success(
            t("ai-datasets.backend.members.addModal.addSuccess", {
                count: selectedUsers.value.length,
            }),
        );
        resetForm();
        emits("close", true);
    } catch (error) {
        console.error(t("ai-datasets.backend.members.addModal.addMemberFailedLog"), error);
    }
});

watch(
    () => props.modelValue,
    (val) => {
        if (val) {
            searchUsers("");
        }
    },
    { immediate: true },
);

watch(
    () => searchValueDebounced.value,
    (val) => {
        searchUsers(val);
    },
    {
        immediate: false,
    },
);

watch(
    selectedUsers,
    (users) => {
        const ids = users.map((user) => user.id);

        ids.forEach((id) => {
            if (!userRoles.value[id]) {
                userRoles.value[id] = "viewer";
            }
        });

        Object.keys(userRoles.value).forEach((id) => {
            if (!ids.includes(id)) {
                delete userRoles.value[id];
            }
        });
    },
    { deep: true },
);
</script>

<template>
    <BdModal
        :title="t('ai-datasets.backend.members.addModal.title')"
        :description="t('ai-datasets.backend.members.addModal.description')"
        :ui="{ content: 'max-w-xl' }"
        @close="emits('close')"
    >
        <UCommandPalette
            v-model:search-term="searchValue"
            v-model="selectedUsers"
            :groups="groups"
            class="min-h-72 pt-4"
            :multiple="true"
            :ui="{ itemTrailingIcon: 'px-6 text-green-500' }"
            :empty-state="t('ai-datasets.backend.members.addModal.emptyState')"
            :placeholder="t('ai-datasets.backend.members.addModal.searchPlaceholder')"
        >
            <template #item-trailing="{ item }">
                <div class="flex items-center gap-2">
                    <USelect
                        v-model="userRoles[item.id]"
                        :items="roleOptions"
                        label-key="label"
                        value-key="value"
                        :placeholder="t('ai-datasets.backend.members.role.viewer')"
                        @click.stop
                    />
                    <UInput
                        v-model="formData.note"
                        :placeholder="
                            t('ai-datasets.backend.members.addModal.noteInputPlaceholder')
                        "
                        @click.stop
                    />
                    <UButton
                        v-if="!selectedUsers.some((user) => user.id === item.id)"
                        color="primary"
                        size="sm"
                        class="flex-none"
                    >
                        {{ t("ai-datasets.backend.members.addModal.addButton") }}
                    </UButton>
                </div>
            </template>
            <template #empty>
                <div class="flex h-full min-h-36 flex-col items-center justify-center gap-2">
                    <UIcon name="i-lucide-users" class="text-muted-foreground text-2xl" />
                    <div class="text-muted-foreground text-sm">
                        {{ t("ai-datasets.backend.members.addModal.searchPlaceholder") }}
                    </div>
                </div>
            </template>
        </UCommandPalette>

        <!-- 底部按钮 -->
        <div class="mt-6 flex justify-end gap-2">
            <UButton color="neutral" variant="soft" size="lg" @click="emits('close')">
                {{ t("console-common.cancel") }}
            </UButton>
            <UButton
                color="primary"
                size="lg"
                :loading="isLock"
                :disabled="selectedUsers.length === 0"
                @click="submitForm"
            >
                {{ t("console-common.add") }}
            </UButton>
        </div>
    </BdModal>
</template>
