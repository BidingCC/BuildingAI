import { useI18n } from "@buildingai/i18n";
import type { Extension } from "@buildingai/services/console";
import {
  useAppsDecorateItemsInfiniteQuery,
  useAppsDecorateQuery,
  useBatchUpdateSortMutation,
  useConsoleTagsQuery,
  useDeleteConsoleTagMutation,
  useSetAppsDecorateMutation,
  useUpdateItemDecorationMutation,
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
import {
  Check,
  ChevronRight,
  EyeOff,
  GripVertical,
  Loader2,
  PenLine,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

import { AddTagDialog } from "./_components/add-tag-dialog";
import type { AppItemEditValues } from "./_components/app-item-edit-dialog";
import { AppItemEditDialog } from "./_components/app-item-edit-dialog";
import { DecorateSettingsDialog } from "./_components/decorate-settings-dialog";

function extToDisplayItem(ext: Extension) {
  return {
    id: ext.id,
    name: ext.name,
    identifier: ext.identifier,
    title: ext.alias || ext.name,
    description: ext.aliasDescription || ext.description || "",
    avatar: ext.aliasIcon || ext.icon,
    visible: ext.aliasShow ?? true,
    sortOrder: ext.appCenterSort ?? 0,
    tagIds: ext.appCenterTagIds || [],
    status: ext.status as number,
  };
}

type DisplayAppItem = ReturnType<typeof extToDisplayItem>;

function itemToEditValues(item: DisplayAppItem): AppItemEditValues {
  return {
    id: item.id,
    appName: item.name,
    displayName: item.title,
    description: item.description,
    icon: item.avatar ?? "",
    visible: item.visible,
    tagIds: item.tagIds,
  };
}

const SortableAppItem = ({
  item,
  isDragActive,
  onEdit,
}: {
  item: DisplayAppItem;
  isDragActive: boolean;
  onEdit: (item: DisplayAppItem) => void;
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
          !item.visible && "opacity-50",
        )}
      >
        <ItemMedia>
          <Avatar className="size-10 rounded-lg after:rounded-lg">
            <AvatarImage src={item.avatar} className="rounded-lg" />
            <AvatarFallback className="rounded-lg">
              {item.title.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="flex items-center gap-2">
            {item.title}
            {!item.visible && (
              <EyeOff className="text-muted-foreground inline-block size-3.5 shrink-0" />
            )}
          </ItemTitle>
          <ItemDescription className="line-clamp-1">{item.description}</ItemDescription>
        </ItemContent>
        <PermissionGuard permissions="apps-decorate:set">
          <ItemActions
            className={cn(
              "opacity-100 group-hover/apps-item:opacity-100 md:opacity-0",
              isDragActive && "md:opacity-0!",
            )}
          >
            <Button
              size="icon-sm"
              variant="outline"
              className="touch-none rounded-full"
              aria-label={t("decorate.apps.item.editApp")}
              onClick={() => onEdit(item)}
            >
              <ChevronRight />
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "flex touch-none rounded-full px-0 text-center group-hover/apps-item:flex md:hidden",
                isDragActive && !isDragging && "md:hidden!",
              )}
              aria-label={t("decorate.apps.item.dragSort")}
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

const DecorateAppsIndexPage = () => {
  const { t } = useI18n();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [decorateDialogOpen, setDecorateDialogOpen] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [editingAppItem, setEditingAppItem] = useState<DisplayAppItem | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [addTagDialogOpen, setAddTagDialogOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [localTitle, setLocalTitle] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { confirm } = useAlertDialog();
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(searchKeyword), 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const { data: config, refetch: refetchConfig } = useAppsDecorateQuery();
  const { data: tags = [], refetch: refetchTags } = useConsoleTagsQuery("app-center" as any);

  const {
    data: itemsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: itemsLoading,
  } = useAppsDecorateItemsInfiniteQuery({
    keyword: debouncedKeyword || undefined,
    tagId: selectedTagId || undefined,
    pageSize: 20,
  });

  const setConfigMutation = useSetAppsDecorateMutation({
    onSuccess: () => {
      toast.success(t("decorate.apps.saveSuccess"));
      refetchConfig();
    },
  });

  const updateItemMutation = useUpdateItemDecorationMutation({
    onSuccess: () => {
      toast.success(t("decorate.apps.saveSuccess"));
      queryClient.invalidateQueries({ queryKey: ["apps-decorate", "items-infinite"] });
      setEditingAppItem(null);
    },
  });

  const batchSortMutation = useBatchUpdateSortMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apps-decorate", "items-infinite"] });
    },
  });

  const deleteTagMutation = useDeleteConsoleTagMutation({
    onSuccess: () => {
      toast.success(t("decorate.apps.tag.deleteSuccess"));
      refetchTags();
      if (selectedTagId) {
        setSelectedTagId(null);
      }
    },
  });

  useEffect(() => {
    if (config) {
      setLocalTitle(config.title || t("decorate.apps.title"));
      setLocalDescription(config.description || t("decorate.apps.description"));
    }
  }, [config, t]);

  const allItems = useMemo<DisplayAppItem[]>(() => {
    if (!itemsData?.pages) return [];
    return itemsData.pages.flatMap((page) => page.items.map(extToDisplayItem));
  }, [itemsData]);

  // 本地排序状态（支持拖拽即时反馈）
  const [localItems, setLocalItems] = useState<DisplayAppItem[]>([]);
  useEffect(() => {
    setLocalItems(allItems);
  }, [allItems]);

  const displayItems = localItems;

  const bannerEnabled = config?.enabled ?? false;
  const banners = useMemo(() => {
    if (!config?.enabled) return [];
    return config.banners?.filter((b) => b.imageUrl) || [];
  }, [config]);

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
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  const handleAppDragStart = useCallback(() => setIsDragActive(true), []);

  const handleAppDragEnd = useCallback(
    (event: DragEndEvent) => {
      setIsDragActive(false);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = localItems.findIndex((i) => i.id === active.id);
      const newIndex = localItems.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const newItems = arrayMove(localItems, oldIndex, newIndex);
      setLocalItems(newItems); // 乐观更新

      // 批量更新排序
      const sortItems = newItems.map((item, index) => ({ id: item.id, sort: index }));
      batchSortMutation.mutate({ items: sortItems });
    },
    [localItems, batchSortMutation],
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

    const newTitle = editingField === "title" ? editValue : localTitle;
    const newDescription = editingField === "description" ? editValue : localDescription;

    if (editingField === "title") setLocalTitle(newTitle);
    if (editingField === "description") setLocalDescription(newDescription);

    setConfigMutation.mutate({
      enabled: config.enabled,
      title: newTitle,
      description: newDescription,
      banners: config.banners,
    });

    setEditingField(null);
    setEditValue("");
  }, [editingField, editValue, config, localTitle, localDescription, setConfigMutation]);

  const handleSaveAppItem = useCallback(
    (values: AppItemEditValues) => {
      updateItemMutation.mutate({
        extensionId: values.id,
        dto: {
          alias: values.displayName,
          aliasDescription: values.description,
          aliasIcon: values.icon || undefined,
          aliasShow: values.visible,
          appCenterTagIds: values.tagIds,
        },
      });
    },
    [updateItemMutation],
  );

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
                <PermissionGuard permissions="apps-decorate:set">
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
                <PermissionGuard permissions="apps-decorate:set">
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
                  placeholder={t("decorate.apps.searchPlaceholder")}
                  value={searchKeyword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchKeyword(e.target.value)
                  }
                />
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>

          <div className="group/carousel relative mt-8 w-full overflow-hidden rounded-2xl sm:rounded-4xl">
            {bannerEnabled && banners.length > 0 ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {banners.map((banner, index) => (
                    <CarouselItem key={index}>
                      <AspectRatio ratio={4 / 1}>
                        <img
                          src={banner.imageUrl}
                          alt={`banner-${index + 1}`}
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
                  {!bannerEnabled
                    ? t("decorate.apps.banner.disabled")
                    : t("decorate.apps.banner.noBanner")}
                </p>
              </div>
            )}
            <PermissionGuard permissions="apps-decorate:set">
              <Button
                className="absolute right-5 bottom-5 flex translate-y-2 scale-95 items-center gap-2 rounded-full px-5 opacity-100 transition-all duration-300 ease-out group-hover/carousel:translate-y-0 group-hover/carousel:scale-100 group-hover/carousel:opacity-100 active:scale-90 md:opacity-0"
                onClick={() => setDecorateDialogOpen(true)}
              >
                <span className="flex items-center gap-2">{t("decorate.apps.configure")}</span>
              </Button>
            </PermissionGuard>
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
                {t("decorate.apps.tags.all")}
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
                <PermissionGuard permissions="apps-decorate:set">
                  <Button
                    size="icon-xs"
                    className="bg-muted-foreground text-muted absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full opacity-100 shadow-sm transition-opacity duration-200 group-hover:opacity-100 md:opacity-0"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await confirm({
                        title: t("decorate.apps.tag.delete"),
                        description: t("decorate.apps.tag.confirmDelete", { name: tag.name }),
                        confirmVariant: "destructive",
                      });
                      deleteTagMutation.mutate(tag.id);
                    }}
                    disabled={deleteTagMutation.isPending}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </PermissionGuard>
              </div>
            ))}
            <PermissionGuard permissions="apps-decorate:set">
              <div className="inline-flex">
                <Button
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => setAddTagDialogOpen(true)}
                >
                  <Plus />
                </Button>
              </div>
            </PermissionGuard>
          </div>

          <div className="mt-6 sm:px-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleAppDragStart}
              onDragEnd={handleAppDragEnd}
              onDragCancel={() => setIsDragActive(false)}
            >
              {displayItems.length > 0 ? (
                <div className="grid gap-x-4 sm:grid-cols-2">
                  <SortableContext
                    items={displayItems.map((i) => i.id)}
                    strategy={rectSortingStrategy}
                  >
                    {displayItems.map((item) => (
                      <SortableAppItem
                        key={item.id}
                        item={item}
                        isDragActive={isDragActive}
                        onEdit={setEditingAppItem}
                      />
                    ))}
                  </SortableContext>
                </div>
              ) : itemsLoading ? null : (
                <Empty>
                  <EmptyContent>
                    <EmptyDescription>{t("decorate.apps.empty")}</EmptyDescription>
                  </EmptyContent>
                </Empty>
              )}
            </DndContext>

            {/* 滚动加载哨兵 */}
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
      <AppItemEditDialog
        open={!!editingAppItem}
        onOpenChange={(open) => !open && setEditingAppItem(null)}
        item={editingAppItem ? itemToEditValues(editingAppItem) : null}
        tags={tags}
        onSave={handleSaveAppItem}
        isPending={updateItemMutation.isPending}
      />
      <AddTagDialog
        open={addTagDialogOpen}
        onOpenChange={setAddTagDialogOpen}
        onSuccess={() => refetchTags()}
      />
    </PageContainer>
  );
};

export default DecorateAppsIndexPage;
