import { type PagePathInfo, parsePageModules } from "@buildingai/hooks";
import { useI18n } from "@buildingai/i18n";
import {
  type DecorateMenuConfig,
  type DecorateMenuGroup,
  type DecorateMenuItem,
  useDecorateMenuConfigQuery,
  useExtensionMenusQuery,
  useSetDecorateMenuConfigMutation,
} from "@buildingai/services/console";
import { useConfigStore } from "@buildingai/stores";
import { useAuthStore } from "@buildingai/stores";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { IconPicker } from "@buildingai/ui/components/icon-picker";
import { type IconName, LucideIcon } from "@buildingai/ui/components/lucide-icon";
import SvgIcons from "@buildingai/ui/components/svg-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@buildingai/ui/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@buildingai/ui/components/ui/form";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { SidebarMenuButton } from "@buildingai/ui/components/ui/sidebar";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { UserButton } from "@buildingai/ui/layouts/styles/default/_components/default-nav-user";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CircleMinus,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  PanelLeftIcon,
  PenLine,
  PlusCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type NavItem = DecorateMenuItem;

const MENU_HOME_FIXED = "menu_home_fixed";
const MENU_HISTORY_FIXED = "menu_history_fixed";

/**
 * Check if a menu item is a fixed (undeletable) item.
 */
const isFixedMenu = (id: string) => id === MENU_HOME_FIXED || id === MENU_HISTORY_FIXED;

const SortableNavItem = ({
  item,
  onEdit,
  onDelete,
  onToggleHidden,
}: {
  item: NavItem;
  onEdit: (item: NavItem) => void;
  onDelete: (id: string) => void;
  onToggleHidden: (id: string) => void;
}) => {
  const isFixed = isFixedMenu(item.id);
  const isHome = item.id === MENU_HOME_FIXED;
  const canHide = !isHome;
  const canDelete = !isFixed;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SidebarMenuButton className="group h-9">
        {item.icon && <LucideIcon name={item.icon as IconName} />}
        <PermissionGuard permissions="decorate-page:set-menu-config" blockOnly>
          <span
            className="mr-auto flex flex-1 cursor-pointer items-center gap-1 whitespace-nowrap"
            onClick={() => onEdit(item)}
          >
            {item.title}
            <PenLine
              strokeWidth={2.5}
              className="text-muted-foreground size-3! transition-opacity group-hover:opacity-100 md:opacity-0"
            />
          </span>
        </PermissionGuard>
        {canHide &&
          (item.isHidden ? (
            <PermissionGuard permissions="decorate-page:set-menu-config">
              <EyeOff
                className="text-muted-foreground shrink-0 cursor-pointer transition-opacity group-hover:opacity-100 md:opacity-0"
                onClick={() => onToggleHidden(item.id)}
              />
            </PermissionGuard>
          ) : (
            <PermissionGuard permissions="decorate-page:set-menu-config">
              <Eye
                className="text-muted-foreground shrink-0 cursor-pointer transition-opacity group-hover:opacity-100 md:opacity-0"
                onClick={() => onToggleHidden(item.id)}
              />
            </PermissionGuard>
          ))}
        {canDelete && (
          <PermissionGuard permissions="decorate-page:set-menu-config">
            <CircleMinus
              className="text-destructive shrink-0 cursor-pointer transition-opacity group-hover:opacity-100 md:opacity-0"
              onClick={() => onDelete(item.id)}
            />
          </PermissionGuard>
        )}
        <PermissionGuard permissions="decorate-page:set-menu-config">
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none active:cursor-grabbing"
          >
            <GripVertical className="text-muted-foreground shrink-0 transition-opacity group-hover:opacity-100 md:opacity-0" />
          </span>
        </PermissionGuard>
      </SidebarMenuButton>
    </div>
  );
};

const menuFormSchema = z.object({
  title: z
    .string()
    .min(1, "Menu name is required")
    .max(32, "Menu name cannot exceed 32 characters"),
  icon: z.string().min(1, "Icon is required"),
  link: z.object({
    label: z.string().optional(),
    path: z.string().optional().default(""),
    type: z.enum(["system", "extension", "custom", "button"]),
    query: z.record(z.string(), z.string()).default({}),
    component: z.string().nullable(),
    target: z.enum(["_self", "_blank"]),
  }),
});

type MenuFormValues = z.infer<typeof menuFormSchema>;

type MenuFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MenuFormValues) => void;
  isPending?: boolean;
  editItem?: NavItem | null;
};

// Use import.meta.glob to get all page paths at build time
const pageModules = import.meta.glob("/src/pages/**/index.tsx", { eager: true });

const pagePaths = parsePageModules(pageModules, {
  exclude: ["/console/", "/_", "/install"],
});

const getDefaultFormValues = (item?: NavItem | null): MenuFormValues => ({
  title: item?.title ?? "",
  icon: item?.icon ?? "",
  link: {
    label: item?.link?.label ?? "",
    path: item?.link?.path ?? "",
    type: item?.link?.type ?? "system",
    query: item?.link?.query ?? {},
    component: item?.link?.component ?? null,
    target: item?.link?.target ?? "_self",
  },
});

const MenuFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  editItem,
}: MenuFormDialogProps) => {
  const { t } = useI18n();
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const skipLinkTypeSideEffectsRef = useRef(false);
  const isEditMode = !!editItem;
  const isEditingFixed = !!editItem && isFixedMenu(editItem.id);
  const isEditingHistory = editItem?.id === MENU_HISTORY_FIXED;
  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuFormSchema as any),
    defaultValues: getDefaultFormValues(),
  });

  const linkType = form.watch("link.type");
  const { data: extensionMenus = [] } = useExtensionMenusQuery({
    enabled: linkType === "extension",
  });

  useEffect(() => {
    if (open) {
      // Prevent `link.type` derived side effects from mutating values during form reset.
      skipLinkTypeSideEffectsRef.current = true;
      form.reset(getDefaultFormValues(editItem));
    }
  }, [open, form, editItem]);

  useEffect(() => {
    if (skipLinkTypeSideEffectsRef.current) {
      skipLinkTypeSideEffectsRef.current = false;
      return;
    }

    if (linkType === "system") {
      return;
    }

    // For non-system types we don't need component.
    form.setValue("link.component", null);

    // Only clear `path` for types that don't use a freeform URL path.
    // - `custom`: user provided URL, keep it
    // - `extension`: path comes from selection (safe to clear when switching)
    // - `button`: no path
    if (linkType === "extension" || linkType === "button") {
      form.setValue("link.path", "");
    }
  }, [linkType, form]);

  const handleSubmit = (values: MenuFormValues) => {
    onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-sm:p-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("decorate.layout.menu.edit") : t("decorate.layout.menu.add")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEditMode ? t("decorate.layout.menu.edit") : t("decorate.layout.menu.add")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form ref={setContainer} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("decorate.layout.menu.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("decorate.layout.menu.namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("decorate.layout.menu.icon")}</FormLabel>
                  <FormControl>
                    <IconPicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t("decorate.layout.menu.iconPlaceholder")}
                      container={container}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="link.type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("decorate.layout.menu.type")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isEditingFixed}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("decorate.layout.menu.typePlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="system">{t("decorate.layout.menu.typeSystem")}</SelectItem>
                      <SelectItem value="extension">
                        {t("decorate.layout.menu.typeExtension")}
                      </SelectItem>
                      <SelectItem value="custom">{t("decorate.layout.menu.typeCustom")}</SelectItem>
                      <SelectItem value="button">{t("decorate.layout.menu.typeButton")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {linkType !== "button" && linkType !== "extension" && !isEditingHistory && (
              <FormField
                control={form.control}
                name="link.path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("decorate.layout.menu.path")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("decorate.layout.menu.pathPlaceholder")}
                        disabled={linkType === "system"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {linkType === "extension" && (
              <FormField
                control={form.control}
                name="link.path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("decorate.layout.menu.selectApp")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("decorate.layout.menu.selectApp")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {extensionMenus.map((ext) => (
                          <SelectItem key={ext.identifier} value={ext.path}>
                            {ext.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {linkType === "system" && (
              <FormField
                control={form.control}
                name="link.component"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("decorate.layout.menu.componentPath")}</FormLabel>
                    <FormControl>
                      <Combobox<PagePathInfo>
                        value={pagePaths.find((p) => p.component === field.value) ?? null}
                        onValueChange={(item) => {
                          field.onChange(item?.component ?? null);
                          if (!isEditingFixed) {
                            form.setValue("link.path", item?.path ?? "");
                          }
                        }}
                        items={pagePaths}
                        itemToStringValue={(item) => item.label}
                      >
                        <ComboboxInput
                          placeholder={t("decorate.layout.menu.pathPlaceholder")}
                          className="w-full"
                        />
                        <ComboboxContent container={container}>
                          <ComboboxEmpty>{t("decorate.layout.menu.pathNotFound")}</ComboboxEmpty>
                          <ComboboxList>
                            {(item) => (
                              <ComboboxItem key={item.component} value={item}>
                                {item.label}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {linkType === "custom" && (
              <FormField
                control={form.control}
                name="link.target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("decorate.layout.menu.target")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("decorate.layout.menu.targetPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_self">
                          {t("decorate.layout.menu.targetSelf")}
                        </SelectItem>
                        <SelectItem value="_blank">
                          {t("decorate.layout.menu.targetBlank")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter className="mb-0 max-sm:flex-row max-sm:gap-4">
              <Button
                type="button"
                className="max-sm:flex-1"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("common.action.cancel")}
              </Button>
              <Button className="max-sm:flex-1" type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                {isEditMode ? t("common.action.save") : t("decorate.layout.menu.add")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Sortable sub-menu item within a group.
 */
const SortableGroupMenuItem = ({
  item,
  groupId,
  onEdit,
  onDelete,
  onToggleHidden,
}: {
  item: NavItem;
  groupId: string;
  onEdit: (groupId: string, item: NavItem) => void;
  onDelete: (groupId: string, itemId: string) => void;
  onToggleHidden: (groupId: string, itemId: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SidebarMenuButton className="group/sub h-9">
        {item.icon && <LucideIcon name={item.icon as IconName} />}
        <PermissionGuard permissions="decorate-page:set-menu-config" blockOnly>
          <span
            className="mr-auto flex flex-1 cursor-pointer items-center gap-1 whitespace-nowrap"
            onClick={() => onEdit(groupId, item)}
          >
            {item.title}
            <PenLine
              strokeWidth={2.5}
              className="text-muted-foreground size-3! transition-opacity group-hover/sub:opacity-100 md:opacity-0"
            />
          </span>
        </PermissionGuard>
        {item.isHidden ? (
          <PermissionGuard permissions="decorate-page:set-menu-config">
            <EyeOff
              className="text-muted-foreground shrink-0 cursor-pointer transition-opacity group-hover/sub:opacity-100 md:opacity-0"
              onClick={() => onToggleHidden(groupId, item.id)}
            />
          </PermissionGuard>
        ) : (
          <PermissionGuard permissions="decorate-page:set-menu-config">
            <Eye
              className="text-muted-foreground shrink-0 cursor-pointer transition-opacity group-hover/sub:opacity-100 md:opacity-0"
              onClick={() => onToggleHidden(groupId, item.id)}
            />
          </PermissionGuard>
        )}
        <PermissionGuard permissions="decorate-page:set-menu-config">
          <CircleMinus
            className="text-destructive shrink-0 cursor-pointer transition-opacity group-hover/sub:opacity-100 md:opacity-0"
            onClick={() => onDelete(groupId, item.id)}
          />
        </PermissionGuard>
        <PermissionGuard permissions="decorate-page:set-menu-config">
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none active:cursor-grabbing"
          >
            <GripVertical className="text-muted-foreground shrink-0 transition-opacity group-hover/sub:opacity-100 md:opacity-0" />
          </span>
        </PermissionGuard>
      </SidebarMenuButton>
    </div>
  );
};

/**
 * Sortable group item for the sidebar editor.
 * Displays group label + flat list of menu items, matching the frontend SidebarGroup style.
 */
const SortableGroupItem = ({
  group,
  sensors,
  onEdit,
  onDelete,
  onToggleHidden,
  onEditItem,
  onDeleteItem,
  onToggleHiddenItem,
  onAddItem,
  onReorderItems,
}: {
  group: DecorateMenuGroup;
  sensors: ReturnType<typeof useSensors>;
  onEdit: (group: DecorateMenuGroup) => void;
  onDelete: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onEditItem: (groupId: string, item: NavItem) => void;
  onDeleteItem: (groupId: string, itemId: string) => void;
  onToggleHiddenItem: (groupId: string, itemId: string) => void;
  onAddItem: (groupId: string) => void;
  onReorderItems: (groupId: string, event: DragEndEvent) => void;
}) => {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col gap-1">
      <div className="group flex h-7 items-center gap-2 px-2 text-xs font-medium">
        <PermissionGuard permissions="decorate-page:set-menu-config" blockOnly>
          <span
            className="text-muted-foreground mr-auto flex cursor-pointer items-center gap-1"
            onClick={() => onEdit(group)}
          >
            {group.title}
            <PenLine
              strokeWidth={2.5}
              className="text-muted-foreground size-3! transition-opacity group-hover:opacity-100 md:opacity-0"
            />
          </span>
        </PermissionGuard>
        {group.isHidden ? (
          <PermissionGuard permissions="decorate-page:set-menu-config">
            <EyeOff
              className="text-muted-foreground size-4 shrink-0 cursor-pointer transition-opacity group-hover:opacity-100 md:opacity-0"
              onClick={() => onToggleHidden(group.id)}
            />
          </PermissionGuard>
        ) : (
          <PermissionGuard permissions="decorate-page:set-menu-config">
            <Eye
              className="text-muted-foreground size-4 shrink-0 cursor-pointer transition-opacity group-hover:opacity-100 md:opacity-0"
              onClick={() => onToggleHidden(group.id)}
            />
          </PermissionGuard>
        )}
        <PermissionGuard permissions="decorate-page:set-menu-config">
          <CircleMinus
            className="text-destructive size-4 shrink-0 cursor-pointer transition-opacity group-hover:opacity-100 md:opacity-0"
            onClick={() => onDelete(group.id)}
          />
        </PermissionGuard>
        <PermissionGuard permissions="decorate-page:set-menu-config">
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none active:cursor-grabbing"
          >
            <GripVertical className="text-muted-foreground size-4 shrink-0 transition-opacity group-hover:opacity-100 md:opacity-0" />
          </span>
        </PermissionGuard>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => onReorderItems(group.id, event)}
      >
        <SortableContext
          items={group.items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {group.items.map((item) => (
            <SortableGroupMenuItem
              key={item.id}
              item={item}
              groupId={group.id}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              onToggleHidden={onToggleHiddenItem}
            />
          ))}
        </SortableContext>
      </DndContext>
      <PermissionGuard permissions="decorate-page:set-menu-config" blockOnly>
        <SidebarMenuButton
          className="text-muted-foreground h-9 border border-dashed"
          onClick={() => onAddItem(group.id)}
        >
          <PlusCircle />
          <span className="whitespace-nowrap">{t("decorate.layout.group.addMenu")}</span>
        </SidebarMenuButton>
      </PermissionGuard>
    </div>
  );
};

const groupFormSchema = z.object({
  title: z
    .string()
    .min(1, "Group name is required")
    .max(32, "Group name cannot exceed 32 characters"),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

type GroupFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GroupFormValues) => void;
  isPending?: boolean;
  editGroup?: DecorateMenuGroup | null;
};

const GroupFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  editGroup,
}: GroupFormDialogProps) => {
  const { t } = useI18n();
  const isEditMode = !!editGroup;
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: { title: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ title: editGroup?.title ?? "" });
    }
  }, [open, form, editGroup]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("decorate.layout.group.edit") : t("decorate.layout.group.add")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEditMode ? t("decorate.layout.group.edit") : t("decorate.layout.group.add")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("decorate.layout.group.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("decorate.layout.group.namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="mb-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.action.cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                {isEditMode ? t("common.action.save") : t("decorate.layout.group.add")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export const DecorateLayoutSidebar = () => {
  const { t } = useI18n();
  const { websiteConfig } = useConfigStore((state) => state.config);
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NavItem | null>(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DecorateMenuGroup | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const { confirm } = useAlertDialog();
  const { userInfo } = useAuthStore((state) => state.auth);
  const { isLogin } = useAuthStore((state) => state.authActions);

  const { data: menuConfig, isLoading } = useDecorateMenuConfigQuery();
  const [localMenus, setLocalMenus] = useState<NavItem[]>([]);
  const [localGroups, setLocalGroups] = useState<DecorateMenuGroup[]>([]);

  const setMenuConfigMutation = useSetDecorateMenuConfigMutation({
    onSuccess: () => {
      toast.success(t("decorate.layout.menu.updated"));
      setMenuDialogOpen(false);
      setGroupDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`${t("decorate.layout.menu.updateFailed")}: ${error.message}`);
    },
  });

  useEffect(() => {
    const config =
      (menuConfig as DecorateMenuConfig & { data?: DecorateMenuConfig })?.data ?? menuConfig;
    if (config?.menus) {
      setLocalMenus(config.menus);
    }
    if (config?.groups) {
      setLocalGroups(config.groups);
    }
  }, [menuConfig]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const saveConfig = (menus: NavItem[], groups: DecorateMenuGroup[]) => {
    const config: DecorateMenuConfig = {
      layout: menuConfig?.layout || "default",
      menus,
      groups,
    };
    setMenuConfigMutation.mutate(config);
  };

  // --- Main menu handlers ---

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localMenus.findIndex((item) => item.id === active.id);
      const newIndex = localMenus.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(localMenus, oldIndex, newIndex);
      setLocalMenus(newItems);
      saveConfig(newItems, localGroups);
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (isFixedMenu(id)) return;
    await confirm({
      title: t("decorate.layout.menu.confirmDelete"),
      description: t("decorate.layout.menu.confirmDelete"),
      confirmVariant: "destructive",
      confirmText: t("common.action.delete"),
    });
    const newMenus = localMenus.filter((item) => item.id !== id);
    setLocalMenus(newMenus);
    saveConfig(newMenus, localGroups);
  };

  const handleToggleHidden = (id: string) => {
    if (id === MENU_HOME_FIXED) return;
    const newMenus = localMenus.map((item) =>
      item.id === id ? { ...item, isHidden: !item.isHidden } : item,
    );
    setLocalMenus(newMenus);
    saveConfig(newMenus, localGroups);
  };

  const handleOpenAddDialog = () => {
    setEditingItem(null);
    setEditingGroupId(null);
    setMenuDialogOpen(true);
  };

  const handleOpenEditDialog = (item: NavItem) => {
    setEditingItem(item);
    setEditingGroupId(null);
    setMenuDialogOpen(true);
  };

  // --- Group handlers ---

  const handleGroupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localGroups.findIndex((g) => g.id === active.id);
      const newIndex = localGroups.findIndex((g) => g.id === over.id);
      const newGroups = arrayMove(localGroups, oldIndex, newIndex);
      setLocalGroups(newGroups);
      saveConfig(localMenus, newGroups);
    }
  };

  const handleGroupItemDragEnd = (groupId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const newGroups = localGroups.map((g) => {
        if (g.id !== groupId) return g;
        const oldIndex = g.items.findIndex((i) => i.id === active.id);
        const newIndex = g.items.findIndex((i) => i.id === over.id);
        return { ...g, items: arrayMove(g.items, oldIndex, newIndex) };
      });
      setLocalGroups(newGroups);
      saveConfig(localMenus, newGroups);
    }
  };

  const handleToggleGroupHidden = (id: string) => {
    const newGroups = localGroups.map((g) => (g.id === id ? { ...g, isHidden: !g.isHidden } : g));
    setLocalGroups(newGroups);
    saveConfig(localMenus, newGroups);
  };

  const handleDeleteGroup = async (id: string) => {
    await confirm({
      title: t("decorate.layout.group.confirmDelete"),
      description: t("decorate.layout.group.confirmDelete"),
      confirmVariant: "destructive",
      confirmText: t("common.action.delete"),
    });
    const newGroups = localGroups.filter((g) => g.id !== id);
    setLocalGroups(newGroups);
    saveConfig(localMenus, newGroups);
  };

  const handleOpenAddGroupDialog = () => {
    setEditingGroup(null);
    setGroupDialogOpen(true);
  };

  const handleOpenEditGroupDialog = (group: DecorateMenuGroup) => {
    setEditingGroup(group);
    setGroupDialogOpen(true);
  };

  const handleSubmitGroup = (values: GroupFormValues) => {
    if (editingGroup) {
      const newGroups = localGroups.map((g) =>
        g.id === editingGroup.id ? { ...g, title: values.title } : g,
      );
      setLocalGroups(newGroups);
      saveConfig(localMenus, newGroups);
    } else {
      const newGroup: DecorateMenuGroup = {
        id: `group_${Date.now()}_${crypto.randomUUID()}`,
        title: values.title,
        items: [],
      };
      const newGroups = [...localGroups, newGroup];
      setLocalGroups(newGroups);
      saveConfig(localMenus, newGroups);
    }
  };

  // --- Group item handlers ---

  const handleOpenAddGroupItemDialog = (groupId: string) => {
    setEditingItem(null);
    setEditingGroupId(groupId);
    setMenuDialogOpen(true);
  };

  const handleOpenEditGroupItemDialog = (groupId: string, item: NavItem) => {
    setEditingItem(item);
    setEditingGroupId(groupId);
    setMenuDialogOpen(true);
  };

  const handleDeleteGroupItem = async (groupId: string, itemId: string) => {
    await confirm({
      title: t("decorate.layout.menu.confirmDelete"),
      description: t("decorate.layout.menu.confirmDelete"),
      confirmVariant: "destructive",
      confirmText: t("common.action.delete"),
    });
    const newGroups = localGroups.map((g) =>
      g.id === groupId ? { ...g, items: g.items.filter((i) => i.id !== itemId) } : g,
    );
    setLocalGroups(newGroups);
    saveConfig(localMenus, newGroups);
  };

  const handleToggleGroupItemHidden = (groupId: string, itemId: string) => {
    const newGroups = localGroups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            items: g.items.map((i) => (i.id === itemId ? { ...i, isHidden: !i.isHidden } : i)),
          }
        : g,
    );
    setLocalGroups(newGroups);
    saveConfig(localMenus, newGroups);
  };

  // --- Menu form submit (handles both main menus and group items) ---

  const handleSubmitMenu = (values: MenuFormValues) => {
    const linkData = {
      label: values.link.label || values.title,
      path: values.link.path,
      type: values.link.type,
      query: values.link.query,
      component: values.link.type === "system" ? values.link.component : null,
      target: values.link.target,
    };

    if (editingGroupId) {
      const newItem: NavItem = editingItem
        ? { ...editingItem, title: values.title, icon: values.icon, link: linkData }
        : {
            id: `menu_${Date.now()}_${crypto.randomUUID()}`,
            title: values.title,
            icon: values.icon,
            link: linkData,
          };

      const newGroups = localGroups.map((g) => {
        if (g.id !== editingGroupId) return g;
        return {
          ...g,
          items: editingItem
            ? g.items.map((i) => (i.id === editingItem.id ? newItem : i))
            : [...g.items, newItem],
        };
      });
      setLocalGroups(newGroups);
      saveConfig(localMenus, newGroups);
    } else if (editingItem) {
      const newMenus = localMenus.map((item) =>
        item.id === editingItem.id
          ? { ...item, title: values.title, icon: values.icon, link: linkData }
          : item,
      );
      setLocalMenus(newMenus);
      saveConfig(newMenus, localGroups);
    } else {
      const newMenu: NavItem = {
        id: `menu_${Date.now()}_${crypto.randomUUID()}`,
        title: values.title,
        icon: values.icon,
        link: linkData,
      };
      const newMenus = [...localMenus, newMenu];
      setLocalMenus(newMenus);
      saveConfig(newMenus, localGroups);
    }
  };

  return (
    <div className="bg-sidebar absolute top-0 left-0 flex h-full w-64 flex-col rounded-bl-lg max-sm:w-full max-sm:rounded-br-lg md:border-r">
      <div className="p-2">
        <SidebarMenuButton size="lg" asChild>
          <div className="relative flex items-center justify-between">
            <div>
              <>
                {websiteConfig?.webinfo.logo ? (
                  <Avatar className="h-8 rounded-md after:hidden">
                    <AvatarImage
                      className="rounded-md"
                      src={websiteConfig?.webinfo.logo}
                      alt={websiteConfig?.webinfo.name}
                    />
                    <AvatarFallback className="rounded-md">
                      {websiteConfig?.webinfo.name?.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <SvgIcons.buildingai className="size-8!" />
                )}
              </>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hover:bg-accent-foreground/5 absolute top-1/2 right-2 -translate-y-1/2"
            >
              <PanelLeftIcon />
            </Button>
          </div>
        </SidebarMenuButton>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1 p-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton className="h-9" key={i} />)
          ) : (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localMenus.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {localMenus.map((item) => (
                    <SortableNavItem
                      key={item.id}
                      item={item}
                      onEdit={handleOpenEditDialog}
                      onDelete={handleDeleteMenu}
                      onToggleHidden={handleToggleHidden}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <PermissionGuard permissions="decorate-page:set-menu-config" blockOnly>
                <SidebarMenuButton
                  className="text-muted-foreground h-9 border border-dashed"
                  onClick={handleOpenAddDialog}
                >
                  <PlusCircle />
                  <span className="mr-auto flex-1 whitespace-nowrap">
                    {t("decorate.layout.group.addMenu")}
                  </span>
                </SidebarMenuButton>
              </PermissionGuard>
            </>
          )}
        </div>

        {!isLoading && (
          <div className="mt-4 flex flex-col gap-4 p-2 pt-0">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleGroupDragEnd}
            >
              <SortableContext
                items={localGroups.map((g) => g.id)}
                strategy={verticalListSortingStrategy}
              >
                {localGroups.map((group) => (
                  <SortableGroupItem
                    key={group.id}
                    group={group}
                    sensors={sensors}
                    onEdit={handleOpenEditGroupDialog}
                    onDelete={handleDeleteGroup}
                    onToggleHidden={handleToggleGroupHidden}
                    onEditItem={handleOpenEditGroupItemDialog}
                    onReorderItems={handleGroupItemDragEnd}
                    onDeleteItem={handleDeleteGroupItem}
                    onToggleHiddenItem={handleToggleGroupItemHidden}
                    onAddItem={handleOpenAddGroupItemDialog}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <PermissionGuard permissions="decorate-page:set-menu-config" blockOnly>
              <SidebarMenuButton
                className="text-muted-foreground h-9 border border-dashed"
                onClick={handleOpenAddGroupDialog}
              >
                <PlusCircle />
                <span className="mr-auto flex-1 whitespace-nowrap">
                  {t("decorate.layout.group.addGroup")}
                </span>
              </SidebarMenuButton>
            </PermissionGuard>
          </div>
        )}
      </div>

      <div className="p-2">
        <SidebarMenuButton size="lg">
          <UserButton isLoggedIn={isLogin()} userInfo={userInfo} />
        </SidebarMenuButton>
      </div>

      <MenuFormDialog
        open={menuDialogOpen}
        onOpenChange={setMenuDialogOpen}
        onSubmit={handleSubmitMenu}
        isPending={setMenuConfigMutation.isPending}
        editItem={editingItem}
      />
      <GroupFormDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        onSubmit={handleSubmitGroup}
        isPending={setMenuConfigMutation.isPending}
        editGroup={editingGroup}
      />
    </div>
  );
};
