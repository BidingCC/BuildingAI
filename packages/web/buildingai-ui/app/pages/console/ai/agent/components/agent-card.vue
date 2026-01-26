<script lang="ts" setup>
import { type Agent } from "@buildingai/service/consoleapi/ai-agent";

const props = defineProps<{
    agent: Agent;
}>();

const emits = defineEmits<{
    (e: "delete", agent: Agent): void;
    (e: "edit", agent: Agent): void;
    (e: "exportDsl", agent: Agent): void;
    (e: "updateTags", agent: Agent, tags: string[]): void;
}>();

const router = useRouter();

const { t } = useI18n();

const tags = shallowRef<string[]>([]);
const handleViewDetail = () => {
    router.push(useRoutePath("ai-agent:detail", { id: props.agent.id }));
};

// 智能体创建类型
const agentType = computed(() => {
    if (props.agent.createMode === "coze") {
        return t("ai-agent.backend.create.modes.coze");
    }
    if (props.agent.createMode === "dify") {
        return t("ai-agent.backend.create.modes.dify");
    }
    return t("ai-agent.backend.create.modes.direct");
});

onMounted(() => {
    tags.value = props.agent.tags.map((tag) => tag.id);
});
</script>

<template>
    <div
        class="group border-default relative cursor-pointer rounded-lg border p-4 transition-all duration-200 hover:shadow-lg"
        @click="handleViewDetail"
    >
        <div
            class="absolute bottom-3 left-3.5 z-10 flex gap-1 opacity-100 transition-opacity duration-200 group-hover:opacity-0"
        >
            <div v-if="agent.creator" class="flex items-center justify-center gap-1 text-xs">
                <UAvatar :src="agent.creator?.avatar" alt="avatar" size="2xs" />
                <div class="text-muted-foreground truncate">{{ agent.creator?.nickname }}</div>
            </div>
        </div>

        <div
            class="absolute right-3 bottom-3 z-10 flex gap-1 opacity-100 transition-opacity duration-200 group-hover:opacity-0"
            @click.stop
        >
            <UBadge color="neutral" variant="soft" size="sm">{{ agentType }}</UBadge>
            <UBadge :color="agent.isPublic ? 'success' : 'neutral'" variant="soft" size="sm">
                <UIcon
                    :name="agent.isPublic ? 'i-lucide-globe' : 'i-lucide-globe-lock'"
                    class="mr-1 size-3"
                />
                {{
                    agent.isPublic
                        ? $t("ai-agent.backend.configuration.public")
                        : $t("ai-agent.backend.configuration.private")
                }}
            </UBadge>
        </div>

        <div
            class="absolute right-3 bottom-3 z-10 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            @click.stop
        >
            <UButton
                class="opacity-70 hover:opacity-100"
                icon="i-lucide-file-code"
                size="xs"
                :label="$t('console-common.export')"
                color="success"
                variant="ghost"
                @click.stop="emits('exportDsl', agent)"
            />
            <UButton
                class="opacity-70 hover:opacity-100"
                icon="i-lucide-edit"
                size="xs"
                :label="$t('console-common.edit')"
                color="primary"
                variant="ghost"
                @click.stop="emits('edit', agent)"
            />
            <UButton
                class="opacity-70 hover:opacity-100"
                icon="i-lucide-trash"
                size="xs"
                :label="$t('console-common.delete')"
                color="error"
                variant="ghost"
                @click.stop="emits('delete', agent)"
            />
        </div>

        <div class="mb-3 flex items-start gap-3">
            <div
                class="border-default bg-muted flex size-10 flex-none items-center justify-center rounded-lg border"
            >
                <NuxtImg
                    :src="agent.avatar"
                    alt="avatar"
                    class="size-10 rounded-lg object-contain"
                />
            </div>
            <div class="flex min-w-0 flex-1 flex-col">
                <h3 class="text-foreground truncate text-sm font-medium">
                    {{ agent.name }}
                </h3>

                <!-- 统计信息 -->
                <div class="text-muted-foreground mt-1 text-xs">
                    <span>{{ $t("ai-agent.backend.create.edit") }}</span>
                    <TimeDisplay :datetime="agent.updatedAt" mode="datetime" />
                </div>
            </div>
        </div>

        <!-- 描述文字 -->
        <div class="text-muted-foreground h-10 pr-8 text-xs">
            <p class="line-clamp-2 overflow-hidden">
                {{ agent.description }}
            </p>
        </div>

        <div class="mb-5" @click.stop>
            <TagCreate v-model="tags" type="app" @close="emits('updateTags', agent, tags)">
                <template #trigger>
                    <div class="hover:bg-muted rounded-lg py-1" @click.stop>
                        <UButton
                            v-if="!agent.tags?.length"
                            color="neutral"
                            variant="outline"
                            size="xs"
                        >
                            <UIcon name="i-lucide-tag" class="size-2" />
                            <span>{{ $t("common.tag.addTag") }}</span>
                        </UButton>
                        <div v-else class="flex flex-wrap gap-1">
                            <UBadge
                                v-for="tag in agent.tags"
                                :key="tag.id"
                                color="neutral"
                                variant="outline"
                            >
                                <UIcon name="i-lucide-tag" class="size-2" />
                                <span>{{ tag.name }}</span
                                >1
                            </UBadge>
                        </div>
                    </div>
                </template>
            </TagCreate>
        </div>
    </div>
</template>
