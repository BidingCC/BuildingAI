<script setup lang="ts">
import type { MenuCreateRequest, MenuFormData } from "@buildingai/service/consoleapi/menu";
import {
    apiCreateMenu,
    apiGetMenuDetail,
    apiGetMenuTree,
    apiUpdateMenu,
} from "@buildingai/service/consoleapi/menu";
import { number, object, string } from "yup";

const props = defineProps<{
    id: string | null;
    parentId?: string | null;
    sourceType?: number;
}>();
const emits = defineEmits<{
    (e: "close", refresh?: boolean): void;
}>();

const { t } = useI18n();
const toast = useMessage();

const menuTree = shallowRef<MenuFormData[]>([]);
const formData = shallowReactive<MenuCreateRequest>({
    name: "",
    path: "",
    icon: "",
    type: 0,
    parentId: props.parentId || null,
    permissionCode: "",
    sort: 0,
    isHidden: 0,
    component: "",
    sourceType: props.sourceType || 1,
});

const menuSchema = object({
    name: string().required(t("system-perms.menu.nameInput")),
    type: number().required(t("system-perms.menu.typeRequired")),
    path: string().when("type", {
        is: (val: number) => val === 1,
        then: (schema) => schema.required(t("system-perms.menu.pathRequired")),
        otherwise: (schema) => schema,
    }),
});

/**
 * 树形选择器选项接口
 */
interface TreeSelectOption {
    label: string;
    value: string | number | null;
    level: number | null;
    icon?: string;
}

const flattenMenuTree = (
    items: MenuFormData[],
    excludeId?: string | number,
    level = 0,
): TreeSelectOption[] =>
    items.flatMap((item) => {
        if (excludeId && item.id === excludeId) return [];
        const current: TreeSelectOption[] = [
            {
                label: t(item.name),
                value: item.id as string | number,
                level,
                icon: item.icon,
            },
        ];
        return current.concat(flattenMenuTree(item.children || [], excludeId, level + 1));
    });

const treeSelectOptions = computed(() => [
    { label: t("console-common.menuType.top"), value: null, level: null },
    ...flattenMenuTree(menuTree.value, props.id as string),
]);

const fetchMenuTree = async () => {
    try {
        menuTree.value = await apiGetMenuTree(props.sourceType || 1);
    } catch (error) {
        console.error("获取菜单树失败:", error);
    }
};

const { lockFn: fetchDetail, isLock: detailLoading } = useLockFn(async () => {
    try {
        const data: MenuFormData = await apiGetMenuDetail(props.id as string);
        useFormData(formData, data);
    } catch (error) {
        console.error("获取详情失败:", error);
    }
});

const { lockFn: submitForm, isLock } = useLockFn(async () => {
    try {
        if (props.id) {
            await apiUpdateMenu(props.id as string, formData);
        } else {
            await apiCreateMenu(formData);
        }
        toast.success(t("system-perms.menu.success"));
        emits("close", true);
    } catch (error) {
        console.error("提交失败:", error);
    }
});

onMounted(async () => {
    // 初始化菜单树数据
    await fetchMenuTree();
    // 初始化菜单详情数据
    if (props.id) {
        fetchDetail();
    }
});
</script>

<template>
    <BdModal
        :title="t('system-perms.menu.menuInfo')"
        :description="t('system-perms.menu.menuInfoDesc')"
        :ui="{ content: 'max-w-lg' }"
        @close="emits('close', false)"
    >
        <div v-if="detailLoading" class="flex items-center justify-center" style="height: 384px">
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin" />
        </div>

        <UForm v-else :state="formData" :schema="menuSchema" class="space-y-4" @submit="submitForm">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <UFormField :label="t('system-perms.menu.name')" name="name" required>
                    <UInput
                        v-model="formData.name"
                        :placeholder="t('system-perms.menu.nameInput')"
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>

                <UFormField :label="t('system-perms.menu.type')" name="type" required>
                    <USelect
                        v-model="formData.type"
                        :placeholder="t('system-perms.menu.typeSelect')"
                        value-key="value"
                        :items="[
                            { label: t('console-common.menuType.group'), value: 0 },
                            { label: t('console-common.menuType.catalogue'), value: 1 },
                            { label: t('console-common.menuType.menu'), value: 2 },
                            { label: t('console-common.menuType.button'), value: 3 },
                        ]"
                        :ui="{ base: 'w-full' }"
                    />
                </UFormField>

                <UFormField
                    v-if="formData.type !== 0"
                    :label="t('system-perms.menu.parentMenu')"
                    name="parentId"
                >
                    <USelect
                        v-model="formData.parentId"
                        :placeholder="t('system-perms.menu.parentMenuSelect')"
                        value-key="value"
                        :items="treeSelectOptions"
                        :ui="{ base: 'w-full' }"
                    >
                        <template #item="{ item }">
                            <div class="flex items-center">
                                <div
                                    v-if="item.level && item.level > 0"
                                    :style="{ marginLeft: `${item.level * 16}px` }"
                                    class="flex items-center"
                                >
                                    <UIcon
                                        name="i-lucide-corner-down-right"
                                        class="mr-1 text-gray-400"
                                    />
                                </div>
                                <UIcon
                                    v-if="item.icon"
                                    :name="item.icon"
                                    class="text-primary mr-2"
                                />
                                <span>{{ item.label }}</span>
                            </div>
                        </template>
                    </USelect>
                </UFormField>

                <UFormField
                    v-if="formData.type !== 0"
                    :label="t('system-perms.menu.icon')"
                    name="icon"
                >
                    <IconPicker
                        v-model="formData.icon"
                        :placeholder="t('system-perms.menu.iconInput')"
                    />
                </UFormField>

                <!-- 菜单路径字段 - 目录和菜单类型显示 -->
                <UFormField
                    v-if="formData.type !== 3 && formData.type !== 0"
                    :label="t('system-perms.menu.path')"
                    name="path"
                    :required="formData.type === 1"
                >
                    <UInput
                        v-model="formData.path"
                        :placeholder="t('system-perms.menu.pathInput')"
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>

                <!-- 组件路径字段 - 只有菜单类型显示 -->
                <UFormField
                    v-if="formData.type === 2"
                    :label="t('system-perms.menu.component')"
                    name="component"
                >
                    <ComponentPicker
                        v-model="formData.component"
                        :placeholder="t('system-perms.menu.componentInput')"
                    />
                </UFormField>

                <!-- 权限编码字段 - 菜单和按钮类型显示 -->
                <UFormField
                    v-if="formData.type !== 1 && formData.type !== 0"
                    :label="t('system-perms.menu.permissionCode')"
                    name="permissionCode"
                >
                    <PermissionPicker
                        v-model="formData.permissionCode"
                        :type="props.sourceType === 1 ? 'system' : 'plugin'"
                        :placeholder="t('system-perms.menu.permissionCodeInput')"
                    />
                </UFormField>

                <UFormField :label="t('console-common.sort')" name="sort">
                    <UInput
                        v-model="formData.sort"
                        type="number"
                        :placeholder="t('system-perms.menu.sortInput')"
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>
            </div>

            <UFormField :label="t('system-perms.menu.displayStatus')" name="hidden">
                <USwitch
                    :model-value="!formData.isHidden"
                    unchecked-icon="i-lucide-x"
                    checked-icon="i-lucide-check"
                    size="lg"
                    :label="t('console-common.statusHelp')"
                    @change="(value) => (formData.isHidden = !formData.isHidden ? 1 : 0)"
                />
            </UFormField>

            <div class="mt-4 flex justify-end gap-2">
                <UButton color="neutral" variant="soft" size="lg" @click="emits('close', false)">
                    {{ t("console-common.cancel") }}
                </UButton>
                <UButton color="primary" size="lg" type="submit" :loading="isLock">
                    {{ t("console-common.confirm") }}
                </UButton>
            </div>
        </UForm>
    </BdModal>
</template>
