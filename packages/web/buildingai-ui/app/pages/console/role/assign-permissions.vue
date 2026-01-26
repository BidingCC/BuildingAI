<script lang="ts" setup>
import type { PermissionGroup } from "@buildingai/service/consoleapi/permission";
import { apiGetPermissionList } from "@buildingai/service/consoleapi/permission";
import { apiAssignPermissions, apiGetRoleDetail } from "@buildingai/service/consoleapi/role";

const props = defineProps<{
    id: string | number | null;
}>();

const emit = defineEmits<{
    (e: "close", refresh?: boolean): void;
}>();

const { t } = useI18n();
const toast = useMessage();

const permissionGroups = shallowRef<PermissionGroup[]>([]);
const selectedPermissionIds = ref<string[]>([]);

const allPermissionIds = computed(() =>
    permissionGroups.value.flatMap(
        (group) => group.permissions?.map((p) => p.id).filter(Boolean) ?? [],
    ),
);

function addPermission(id: string) {
    if (!selectedPermissionIds.value.includes(id)) {
        selectedPermissionIds.value.push(id);
    }
}

function removePermission(id: string) {
    const index = selectedPermissionIds.value.indexOf(id);
    if (index !== -1) {
        selectedPermissionIds.value.splice(index, 1);
    }
}

function togglePermission(id: string) {
    if (selectedPermissionIds.value.includes(id)) {
        removePermission(id);
    } else {
        addPermission(id);
    }
}

function selectAll() {
    selectedPermissionIds.value = [...allPermissionIds.value];
}

function deselectAll() {
    selectedPermissionIds.value = [];
}

function invertSelection() {
    selectedPermissionIds.value = allPermissionIds.value.filter(
        (id) => !selectedPermissionIds.value.includes(id),
    );
}

const { lockFn: loadPermissions, isLock: permissionsLoading } = useLockFn(async () => {
    try {
        const response = await apiGetPermissionList({
            isDeprecated: false,
            isGrouped: true,
        });
        permissionGroups.value = response as PermissionGroup[];
    } catch (error) {
        console.error("加载权限列表失败:", error);
    }
});

const { lockFn: loadRoleDetail, isLock: loading } = useLockFn(async () => {
    if (!props.id) return;

    try {
        const role = await apiGetRoleDetail(props.id as string);
        selectedPermissionIds.value = role.permissions?.map((p) => p.id) ?? [];
    } catch (error) {
        console.error("加载角色详情失败:", error);
    }
});

const { isLock: isSubmitting, lockFn: submitPermissions } = useLockFn(async () => {
    if (!props.id) {
        toast.error(t("system-perms.role.roleIdRequired"));
        return;
    }

    try {
        await apiAssignPermissions({
            id: props.id as string,
            permissionIds: selectedPermissionIds.value,
        });

        toast.success(t("system-perms.role.assignPermissionsSuccess"));
        emit("close", true);
    } catch (error) {
        console.error("分配权限失败:", error);
    }
});

function toggleGroupPermissions(groupCode: string, checked: boolean) {
    const group = permissionGroups.value.find((g) => g.code === groupCode);
    if (!group) return;

    group.permissions.forEach((p) => {
        if (checked) {
            addPermission(p.id);
        } else {
            removePermission(p.id);
        }
    });
}

function isGroupAllSelected(groupCode: string): boolean {
    const group = permissionGroups.value.find((g) => g.code === groupCode);
    if (!group || !group.permissions.length) return false;

    return group.permissions.every((p) => selectedPermissionIds.value.includes(p.id));
}

function isGroupPartiallySelected(groupCode: string): boolean {
    const group = permissionGroups.value.find((g) => g.code === groupCode);
    if (!group || !group.permissions.length) return false;

    const selectedCount = group.permissions.filter((p) =>
        selectedPermissionIds.value.includes(p.id),
    ).length;

    return selectedCount > 0 && selectedCount < group.permissions.length;
}

onMounted(async () => {
    await Promise.all([loadPermissions(), loadRoleDetail()]);
});
</script>

<template>
    <BdModal
        :title="t('system-perms.role.assignPermissions')"
        :description="t('system-perms.role.assignPermissionsDesc')"
        :ui="{ content: 'max-w-3xl' }"
        @close="emit('close', false)"
    >
        <div
            v-if="loading || permissionsLoading"
            class="flex items-center justify-center"
            style="height: 544px"
        >
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin" />
        </div>
        <div v-else>
            <!-- 全选/反选按钮 -->
            <div class="mb-4 flex items-center justify-between">
                <div class="text-muted-foreground text-sm">
                    {{
                        t("system-perms.role.totalPermissions", {
                            count: allPermissionIds.length,
                        })
                    }}
                </div>
                <div class="flex gap-2">
                    <UButton size="sm" color="primary" variant="soft" @click="selectAll">
                        {{ t("console-common.selectAll") }}
                    </UButton>
                    <UButton size="sm" color="info" variant="soft" @click="deselectAll">
                        {{ t("console-common.selectNone") }}
                    </UButton>
                    <UButton size="sm" color="info" variant="soft" @click="invertSelection">
                        {{ t("system-perms.role.invertSelection") }}
                    </UButton>
                </div>
            </div>

            <!-- 权限列表容器 -->
            <div class="max-h-[40vh] overflow-y-auto">
                <!-- 权限分组列表 -->
                <div v-for="group in permissionGroups" :key="group.code" class="mb-6">
                    <div class="mb-2 flex items-center">
                        <UCheckbox
                            :model-value="
                                isGroupAllSelected(group.code)
                                    ? true
                                    : isGroupPartiallySelected(group.code)
                                      ? 'indeterminate'
                                      : false
                            "
                            :label="group.name"
                            @update:model-value="
                                toggleGroupPermissions(group.code, $event === true)
                            "
                        />
                    </div>

                    <!-- 权限列表 -->
                    <div
                        class="ml-6 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                    >
                        <div
                            v-for="permission in group.permissions"
                            :key="permission.id"
                            class="flex items-center"
                        >
                            <UCheckbox
                                :model-value="selectedPermissionIds.includes(permission.id)"
                                :label="permission.name"
                                @update:model-value="() => togglePermission(permission.id)"
                            />
                        </div>
                    </div>
                </div>

                <!-- 无权限提示 -->
                <div
                    v-if="permissionGroups.length === 0"
                    class="text-muted-foreground py-4 text-center"
                >
                    {{ t("system-perms.role.noPermissions") }}
                </div>
            </div>
        </div>

        <div class="mt-4 flex justify-end gap-2">
            <UButton color="neutral" variant="soft" size="lg" @click="emit('close', false)">
                {{ t("console-common.cancel") }}
            </UButton>
            <UButton
                color="primary"
                size="lg"
                :loading="isSubmitting"
                :disabled="loading || permissionsLoading"
                @click="submitPermissions"
            >
                {{ t("console-common.confirm") }}
            </UButton>
        </div>
    </BdModal>
</template>
