import { useI18n } from "@buildingai/i18n";
import {
  type AgentDecorateItem,
  useAgentDecorateItemsInfiniteQuery,
  useAgentDecorateQuery,
  useBatchUpdateAgentDecorateSortMutation,
  useConsoleTagsQuery,
  useDeleteConsoleTagMutation,
  useSetAgentDecorateMutation,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { AspectRatio } from "@buildingai/ui/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Carousel, CarouselContent, CarouselItem } from "@buildingai/ui/components/ui/carousel";
import { Empty, EmptyContent, EmptyDescription } from "@buildingai/ui/components/ui/empty";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@buildingai/ui/components/ui/input-group";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@buildingai/ui/components/ui/item";
import { SidebarTrigger } from "@buildingai/ui/components/ui/sidebar";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { cn } from "@buildingai/ui/lib/utils";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import Autoplay from "embla-carousel-autoplay";
import { Check, GripVertical, Loader2, PenLine, Plus, Search, X } from "lucide-react";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

import { AddTagDialog } from "./_components/add-tag-dialog";
import { DecorateSettingsDialog } from "./_components/decorate-settings-dialog";

type DisplayAgentItem = {
  id: string;
  title: string;
  description: string;
  avatar?: string | null;
};

/**
 * 将智能体装修项转换为页面展示项。
 */
function agentToDisplayItem(agent: AgentDecorateItem): DisplayAgentItem {
  return {
    id: agent.id,
    title: agent.name,
    description: agent.description?.trim() || agent.creator?.nickname || "",
    avatar: agent.avatar ?? agent.creator?.avatar ?? null,
  };
}

/**
 * 可拖拽的智能体装修项。
 */
const SortableAgentItem = ({
  item,
  isDragActive,
}: {
  item: DisplayAgentItem;
  isDragActive: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
    }),
    [transform, transition, isDragging],
  );
  const { t } = useI18n();
  return (
    <div ref={setNodeRef} style={style}>
      <Item
        className={cn(
          "group/apps-item hover:bg-accent cursor-pointer px-0 transition-[padding] hover:px-4",
          isDragActive && "md:hover:bg-transparent md:hover:px-0",
        )}
      >
        <ItemMedia>
          <Avatar className="size-10">
            <AvatarImage src={item.avatar ?? undefined} />
            <AvatarFallback>{item.title.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{item.title}</ItemTitle>
          <ItemDescription className="line-clamp-1">{item.description}</ItemDescription>
        </ItemContent>
        <PermissionGuard permissions="agent-decorate:set">
          <ItemActions
            className={cn(
              "opacity-100 group-hover/apps-item:opacity-100 md:opacity-0",
              isDragActive && "md:opacity-0!",
            )}
          >
            <Button
              variant="ghost"
              className={cn(
                "flex touch-none rounded-full px-0 text-center group-hover/apps-item:flex md:hidden",
                isDragActive && !isDragging && "md:hidden!",
              )}
              aria-label={t("decorate.agent.item.dragSort")}
              {...attributes}
              {...listeners}
            >
              <GripVertical />
            </Button>
          </ItemActions>
        </PermissionGuard>
      </Item>
    </div>
  );
};

/**
 * 智能体广场装修页。
 */
const DecorateAgentIndexPage = () => {
  const { t } = useI18n();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [decorateDialogOpen, setDecorateDialogOpen] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [addTagDialogOpen, setAddTagDialogOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [localTitle, setLocalTitle] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const [localItems, setLocalItems] = useState<DisplayAgentItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { confirm } = useAlertDialog();
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(searchKeyword), 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const { data: config, refetch: refetchConfig } = useAgentDecorateQuery();
  const { data: tags = [], refetch: refetchTags } = useConsoleTagsQuery("app");
  const {
    data: itemsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: itemsLoading,
  } = useAgentDecorateItemsInfiniteQuery({
    keyword: debouncedKeyword || undefined,
    tagId: selectedTagId || undefined,
    pageSize: 20,
  });

  const setConfigMutation = useSetAgentDecorateMutation({
    onSuccess: () => {
      toast.success(t("decorate.agent.saveSuccess"));
      refetchConfig();
    },
    onError: (e) => toast.error(t("decorate.agent.saveFailed", { message: e.message })),
  });

  const batchSortMutation = useBatchUpdateAgentDecorateSortMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-decorate", "items-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["web", "agent-decorate", "items-infinite"] });
    },
    onError: (e) => toast.error(t("decorate.agent.sortSaveFailed", { message: e.message })),
  });

  const deleteTagMutation = useDeleteConsoleTagMutation({
    onSuccess: () => {
      toast.success(t("decorate.agent.tag.deleteSuccess"));
      refetchTags();
      if (selectedTagId) {
        setSelectedTagId(null);
      }
    },
    onError: (error: Error) => {
      toast.error(
        t("decorate.agent.deleteFailed", {
          message: error.message || t("common.action.unknownError"),
        }),
      );
    },
  });

  useEffect(() => {
    if (config) {
      setLocalTitle(config.title || t("decorate.agent.title"));
      setLocalDescription(config.description || t("decorate.agent.description"));
    }
  }, [config, t]);

  const banners = useMemo(() => {
    if (!config?.enabled) return [];

    if (config.banners && config.banners.length > 0) {
      return config.banners.filter((banner) => banner.imageUrl);
    }

    if (config.heroImageUrl) {
      return [
        {
          imageUrl: config.heroImageUrl,
          linkUrl: config.link?.path,
          linkType: "system" as const,
        },
      ];
    }

    return [];
  }, [config]);

  const allItems = useMemo<DisplayAgentItem[]>(() => {
    if (!itemsData?.pages) return [];
    return itemsData.pages.flatMap((page) => page.items.map(agentToDisplayItem));
  }, [itemsData]);

  useEffect(() => {
    setLocalItems(allItems);
  }, [allItems]);

  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  const handleAgentDragStart = useCallback(() => setIsDragActive(true), []);

  const handleAgentDragEnd = useCallback(
    (event: DragEndEvent) => {
      setIsDragActive(false);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = localItems.findIndex((item) => item.id === active.id);
      const newIndex = localItems.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const nextItems = arrayMove(localItems, oldIndex, newIndex);
      setLocalItems(nextItems);
      batchSortMutation.mutate({
        items: nextItems.map((item, index) => ({ id: item.id, sort: index })),
      });
    },
    [batchSortMutation, localItems],
  );

  const handleStartEdit = useCallback((field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue || "");
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingField(null);
    setEditValue("");
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!config) return;

    const nextTitle = editingField === "title" ? editValue : localTitle;
    const nextDescription = editingField === "description" ? editValue : localDescription;

    if (editingField === "title") setLocalTitle(nextTitle);
    if (editingField === "description") setLocalDescription(nextDescription);

    setConfigMutation.mutate({
      ...config,
      title: nextTitle,
      description: nextDescription,
    });

    setEditingField(null);
    setEditValue("");
  }, [config, editValue, editingField, localDescription, localTitle, setConfigMutation]);

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  return (
    <PageContainer>
      <div className="flex w-full flex-col items-center">
        <div className="flex h-13 w-full items-center px-2">
          <SidebarTrigger className="md:hidden" />
        </div>

        <div className="w-full max-w-4xl px-4 py-8 pt-12 sm:pt-20 md:px-6">
          <div className="flex flex-col items-center justify-between gap-4 max-sm:items-start sm:flex-row sm:px-3">
            <div className="flex flex-1 flex-col gap-2">
              <div className="group/title flex items-center gap-3">
                {editingField === "title" ? (
                  <Input
                    ref={inputRef}
                    className="h-8 w-full rounded-none border-0 border-none bg-transparent! px-0 text-2xl! shadow-none ring-0 focus-within:ring-0 focus-visible:ring-0"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                    disabled={setConfigMutation.isPending}
                  />
                ) : (
                  <h1 className="text-2xl">{localTitle}</h1>
                )}
                <PermissionGuard permissions="agent-decorate:set">
                  {editingField === "title" ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        className="size-8"
                        onClick={handleSaveEdit}
                        disabled={setConfigMutation.isPending}
                      >
                        <Check />
                      </Button>
                      <Button variant="ghost" className="size-8" onClick={handleCancelEdit}>
                        <X />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      className="size-8 opacity-100 transition-opacity sm:group-hover/title:opacity-100 md:opacity-0"
                      onClick={() => handleStartEdit("title", localTitle)}
                    >
                      <PenLine />
                    </Button>
                  )}
                </PermissionGuard>
              </div>
              <div className="group/description flex items-center gap-3">
                {editingField === "description" ? (
                  <Input
                    ref={inputRef}
                    className="text-muted-foreground h-5 w-full rounded-none border-0 border-none bg-transparent! px-0 shadow-none ring-0 focus-within:ring-0 focus-visible:ring-0"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                    disabled={setConfigMutation.isPending}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">{localDescription}</p>
                )}
                <PermissionGuard permissions="agent-decorate:set">
                  {editingField === "description" ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        className="text-muted-foreground size-5"
                        onClick={handleSaveEdit}
                        disabled={setConfigMutation.isPending}
                      >
                        <Check />
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-muted-foreground size-5"
                        onClick={handleCancelEdit}
                      >
                        <X />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      className="text-muted-foreground size-5 opacity-100 transition-opacity md:opacity-0 md:group-hover/description:opacity-100"
                      onClick={() => handleStartEdit("description", localDescription)}
                    >
                      <PenLine />
                    </Button>
                  )}
                </PermissionGuard>
              </div>
            </div>
            <div className="max-sm:w-full">
              <InputGroup className="rounded-full">
                <InputGroupInput
                  placeholder={t("decorate.agent.searchPlaceholder")}
                  value={searchKeyword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchKeyword(e.target.value)}
                />
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>

          <div className="no-scrollbar mt-6 flex flex-nowrap gap-2 overflow-x-auto pt-2 sm:px-3">
            <div
              className="group relative inline-flex cursor-pointer"
              onClick={() => setSelectedTagId(null)}
            >
              <Badge
                variant={selectedTagId === null ? "default" : "secondary"}
                className="h-9 px-4 font-medium text-nowrap sm:font-normal"
              >
                {t("decorate.agent.tags.all")}
              </Badge>
            </div>
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="group relative inline-flex cursor-pointer"
                onClick={() => setSelectedTagId(tag.id)}
              >
                <Badge
                  variant={selectedTagId === tag.id ? "default" : "secondary"}
                  className="h-9 px-4 font-medium text-nowrap sm:font-normal"
                >
                  {tag.name}
                </Badge>
                <Button
                  size="icon-xs"
                  className="bg-muted-foreground text-muted absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full opacity-100 shadow-sm transition-opacity duration-200 group-hover:opacity-100 md:opacity-0"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await confirm({
                      title: t("decorate.agent.tag.delete"),
                      description: t("decorate.agent.tag.confirmDelete", { name: tag.name }),
                      confirmVariant: "destructive",
                    });
                    deleteTagMutation.mutate(tag.id);
                  }}
                  disabled={deleteTagMutation.isPending}
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
            ))}
            <div className="inline-flex">
              <Button
                variant="secondary"
                className="rounded-full"
                onClick={() => setAddTagDialogOpen(true)}
              >
                <Plus />
              </Button>
            </div>
          </div>

          <div className="group/carousel relative mt-8 w-full overflow-hidden rounded-2xl sm:rounded-4xl">
            {banners.length > 0 ? (
              <Carousel
                className="w-full rounded-2xl sm:rounded-4xl"
                plugins={[
                  Autoplay({
                    delay: 3000,
                  }),
                ]}
              >
                <CarouselContent>
                  {banners.map((banner, index) => (
                    <CarouselItem key={`${banner.imageUrl}-${index}`}>
                      <AspectRatio ratio={4 / 1}>
                        <img
                          src={banner.imageUrl}
                          alt={`agent-square-banner-${index + 1}`}
                          className="h-full w-full rounded-2xl object-cover"
                        />
                      </AspectRatio>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            ) : (
              <div className="bg-muted/30 flex aspect-20/5 flex-col items-center justify-center gap-2 rounded-2xl">
                <p className="text-muted-foreground text-sm">
                  {!config?.enabled
                    ? t("decorate.agent.banner.disabled")
                    : t("decorate.agent.banner.noBanner")}
                </p>
              </div>
            )}
            <PermissionGuard permissions="agent-decorate:set">
              <Button
                className="absolute right-5 bottom-5 flex translate-y-2 scale-95 items-center gap-2 rounded-full px-5 opacity-100 transition-all duration-300 ease-out group-hover/carousel:translate-y-0 group-hover/carousel:scale-100 group-hover/carousel:opacity-100 active:scale-90 md:opacity-0"
                onClick={() => setDecorateDialogOpen(true)}
              >
                <span className="flex items-center gap-2">{t("decorate.agent.configure")}</span>
              </Button>
            </PermissionGuard>
          </div>

          <div className="mt-6 sm:px-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleAgentDragStart}
              onDragEnd={handleAgentDragEnd}
              onDragCancel={() => setIsDragActive(false)}
            >
              {localItems.length > 0 ? (
                <div className="grid gap-x-4 sm:grid-cols-2">
                  <SortableContext
                    items={localItems.map((item) => item.id)}
                    strategy={rectSortingStrategy}
                  >
                    {localItems.map((item) => (
                      <SortableAgentItem key={item.id} item={item} isDragActive={isDragActive} />
                    ))}
                  </SortableContext>
                </div>
              ) : itemsLoading ? null : (
                <Empty>
                  <EmptyContent>
                    <EmptyDescription>{t("decorate.agent.empty")}</EmptyDescription>
                  </EmptyContent>
                </Empty>
              )}
            </DndContext>

            <div ref={sentinelRef} className="flex justify-center py-4">
              {isFetchingNextPage && (
                <Loader2 className="text-muted-foreground size-5 animate-spin" />
              )}
            </div>
          </div>
        </div>
      </div>

      <DecorateSettingsDialog
        open={decorateDialogOpen}
        onOpenChange={setDecorateDialogOpen}
        onSuccess={() => refetchConfig()}
      />
      <AddTagDialog
        open={addTagDialogOpen}
        onOpenChange={setAddTagDialogOpen}
        onSuccess={() => refetchTags()}
      />
    </PageContainer>
  );
};

export default DecorateAgentIndexPage;
