import { useI18n } from "@buildingai/i18n";
import {
  type CreateMenuParams,
  type Menu,
  MenuType,
  type Permission,
  type UpdateMenuParams,
  useCreateMenuMutation,
  useDeleteMenuMutation,
  useMenuTreeQuery,
  usePermissionListQuery,
  useUpdateMenuMutation,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { IconPicker } from "@buildingai/ui/components/icon-picker";
import { type IconName, LucideIcon } from "@buildingai/ui/components/lucide-icon";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@buildingai/ui/components/ui/collapsible";
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
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronRightIcon,
  EyeOffIcon,
  FileIcon,
  FolderIcon,
  LayoutGridIcon,
  Loader2Icon,
  MenuIcon,
  MousePointerClickIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useDebounceCallback } from "usehooks-ts";
import { z } from "zod";

import { PageContainer } from "@/layouts/console/_components/page-container";

const MenuTypeLabels: Record<MenuType, string> = {
  [MenuType.GROUP]: "Group",
  [MenuType.DIRECTORY]: "Directory",
  [MenuType.MENU]: "Menu",
  [MenuType.BUTTON]: "Button",
};

const MenuTypeIcons: Record<MenuType, React.ElementType> = {
  [MenuType.GROUP]: LayoutGridIcon,
  [MenuType.DIRECTORY]: FolderIcon,
  [MenuType.MENU]: FileIcon,
  [MenuType.BUTTON]: MousePointerClickIcon,
};

const menuFormSchema = z
  .object({
    name: z
      .string()
      .min(1, "Menu name is required")
      .max(50, "Menu name cannot exceed 50 characters"),
    code: z
      .string()
      .min(1, "Unique identifier is required")
      .max(50, "Unique identifier cannot exceed 50 characters"),
    path: z.string().min(1, "Path is required").max(100, "Path cannot exceed 100 characters"),
    icon: z.string().max(50, "Icon cannot exceed 50 characters").optional().or(z.literal("")),
    component: z
      .string()
      .max(100, "Component path cannot exceed 100 characters")
      .optional()
      .or(z.literal("")),
    permissionCode: z
      .string()
      .max(100, "Permission code cannot exceed 100 characters")
      .optional()
      .or(z.literal("")),
    sort: z.coerce
      .number()
      .min(0, "Sort value must be 0 or greater")
      .max(9999, "Sort value cannot exceed 9999"),
    isHidden: z.boolean(),
    type: z.enum(MenuType),
    parentId: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const isGroupOrDir = data.type === MenuType.GROUP || data.type === MenuType.DIRECTORY;
    if (!isGroupOrDir && data.type !== MenuType.BUTTON && !data.component) {
      ctx.addIssue({
        code: "custom",
        message: "Component path is required",
        path: ["component"],
      });
    }
    // Icon is required for DIRECTORY type
    if (data.type === MenuType.DIRECTORY && !data.icon) {
      ctx.addIssue({
        code: "custom",
        message: "Icon is required",
        path: ["icon"],
      });
    }
  });

type MenuFormData = z.infer<typeof menuFormSchema>;

const defaultFormValues: MenuFormData = {
  name: "",
  code: "",
  path: "",
  icon: "",
  component: "",
  permissionCode: "",
  sort: 0,
  isHidden: false,
  type: MenuType.MENU,
  parentId: undefined,
};

type MenuFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu?: Menu;
  parentId?: string;
  menuTree?: Menu[];
  onSuccess?: () => void;
};

const MenuFormDialog = ({
  open,
  onOpenChange,
  menu,
  parentId,
  menuTree,
  onSuccess,
}: MenuFormDialogProps) => {
  const isEdit = !!menu;
  const { t } = useI18n();
  const form = useForm<MenuFormData>({
    resolver: zodResolver(menuFormSchema as any),
    defaultValues: defaultFormValues,
  });

  const menuType = form.watch("type");
  const watchedParentId = form.watch("parentId");
  const isGroupOrDir = menuType === MenuType.GROUP || menuType === MenuType.DIRECTORY;
  const needsComponent = !isGroupOrDir && menuType !== MenuType.BUTTON;

  const { data: permissionList = [] } = usePermissionListQuery(
    { isDeprecated: false },
    { enabled: open },
  ) as { data: Permission[] };

  const createMutation = useCreateMenuMutation();
  const updateMutation = useUpdateMenuMutation();

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const flattenMenuTree = useCallback((menus: Menu[], result: Menu[] = []): Menu[] => {
    for (const m of menus) {
      result.push(m);
      if (m.children) {
        flattenMenuTree(m.children, result);
      }
    }
    return result;
  }, []);

  const flatMenuList = useMemo(() => {
    return menuTree ? flattenMenuTree(menuTree) : [];
  }, [menuTree, flattenMenuTree]);

  /**
   * Compute the depth of a menu item in the tree.
   * Top-level (no parentId) = 0, first child = 1, etc.
   */
  const getMenuDepth = useCallback(
    (menuId: string): number => {
      const item = flatMenuList.find((m) => m.id === menuId);
      if (!item?.parentId) return 0;
      return 1 + getMenuDepth(item.parentId);
    },
    [flatMenuList],
  );

  const selectedParent = useMemo(
    () => (watchedParentId ? flatMenuList.find((m) => m.id === watchedParentId) : null),
    [watchedParentId, flatMenuList],
  );

  const parentDepth = useMemo(
    () => (watchedParentId ? getMenuDepth(watchedParentId) : -1),
    [watchedParentId, getMenuDepth],
  );

  /** Allowed menu types based on selected parent */
  const allowedMenuTypes = useMemo(() => {
    if (!watchedParentId) {
      return [MenuType.GROUP, MenuType.DIRECTORY, MenuType.MENU, MenuType.BUTTON];
    }
    // Menu parent: only button allowed
    if (selectedParent?.type === MenuType.MENU) {
      return [MenuType.BUTTON];
    }
    // Group can only be top-level
    const types: MenuType[] = [];
    // Directory allowed only under top-level non-directory parents (max 2 levels)
    if (parentDepth < 1 && selectedParent?.type !== MenuType.DIRECTORY) {
      types.push(MenuType.DIRECTORY);
    }
    types.push(MenuType.MENU, MenuType.BUTTON);
    return types;
  }, [watchedParentId, selectedParent, parentDepth]);

  /** Allowed parent menus based on selected type */
  const allowedParentMenus = useMemo(() => {
    return flatMenuList.filter((m) => {
      if (m.id === menu?.id) return false;
      // Group type: only top-level, so no parent allowed (filtered out)
      if (menuType === MenuType.GROUP) return false;
      // Directory type: can only be placed under items at depth 0 (top-level parents)
      if (menuType === MenuType.DIRECTORY) {
        return getMenuDepth(m.id) === 0 && m.type !== MenuType.DIRECTORY;
      }
      // Button: can also be placed under menu
      if (menuType === MenuType.BUTTON) {
        return (
          m.type === MenuType.GROUP || m.type === MenuType.DIRECTORY || m.type === MenuType.MENU
        );
      }
      // Menu: can be placed under group or directory
      return m.type === MenuType.GROUP || m.type === MenuType.DIRECTORY;
    });
  }, [flatMenuList, menuType, menu?.id, getMenuDepth]);

  useEffect(() => {
    if (open) {
      if (menu) {
        form.reset({
          name: menu.name,
          code: menu.code || "",
          path: menu.path || "",
          icon: menu.icon || "",
          component: menu.component || "",
          permissionCode: menu.permissionCode || "",
          sort: menu.sort,
          isHidden: menu.isHidden === 1,
          type: menu.type,
          parentId: menu.parentId,
        });
      } else {
        form.reset({
          ...defaultFormValues,
          parentId: parentId,
        });
      }
    }
  }, [open, menu, parentId, form]);

  useEffect(() => {
    if (!needsComponent) {
      form.setValue("component", "");
    }
  }, [needsComponent, form]);

  // Auto-correct type when it's no longer allowed under current parent
  useEffect(() => {
    if (allowedMenuTypes.length > 0 && !allowedMenuTypes.includes(menuType)) {
      form.setValue("type", allowedMenuTypes[0]);
    }
  }, [allowedMenuTypes, menuType, form]);

  // Auto-correct parentId: group must be top-level
  useEffect(() => {
    if (menuType === MenuType.GROUP && watchedParentId) {
      form.setValue("parentId", undefined);
    }
  }, [menuType, watchedParentId, form]);

  const onSubmit = async (data: MenuFormData) => {
    const payload = {
      name: data.name,
      code: data.code || undefined,
      path: data.path || undefined,
      icon: data.icon || undefined,
      component: data.component || undefined,
      permissionCode: data.permissionCode || undefined,
      sort: data.sort,
      isHidden: data.isHidden ? 1 : 0,
      type: data.type,
      parentId: data.parentId || undefined,
    };

    try {
      if (isEdit && menu) {
        await updateMutation.mutateAsync({
          id: menu.id,
          data: payload as UpdateMenuParams,
        });
        toast.success(t("access.menu.toast.updateSuccess"));
      } else {
        await createMutation.mutateAsync(payload as CreateMenuParams);
        toast.success(t("access.menu.toast.createSuccess"));
      }
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(
        isEdit ? t("access.menu.toast.updateFailed") : t("access.menu.toast.createFailed"),
      );
    }
  };

  const [container, setContainer] = useState<HTMLElement | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={setContainer} className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4">
          <DialogTitle>
            {isEdit ? t("access.menu.form.editTitle") : t("access.menu.form.createTitle")}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <Form {...form}>
            <form
              id="menu-form"
              onSubmit={form.handleSubmit(onSubmit, (errors) => {
                console.error("Form validation errors:", errors);
              })}
              className="space-y-4 p-4 pb-20"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("access.menu.form.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("access.menu.form.namePlaceholder")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("access.menu.form.code")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("access.menu.form.codePlaceholder")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("access.menu.form.path")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("access.menu.form.pathPlaceholder")} />
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
                    <FormLabel required={menuType === MenuType.DIRECTORY}>
                      {t("access.menu.form.icon")}
                    </FormLabel>
                    <FormControl>
                      <IconPicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t("access.menu.form.iconPlaceholder")}
                        container={container}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {needsComponent && (
                <FormField
                  control={form.control}
                  name="component"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>{t("access.menu.form.component")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("access.menu.form.componentPlaceholder")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="permissionCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("access.menu.form.permissionCode")}</FormLabel>
                    <FormControl>
                      <Combobox<Permission>
                        value={permissionList.find((p) => p.code === field.value) ?? null}
                        onValueChange={(item) => {
                          field.onChange(item?.code ?? "");
                        }}
                        items={permissionList}
                        itemToStringValue={(item) => `${item.code} ${item.name}`}
                      >
                        <ComboboxInput
                          placeholder={t("access.menu.form.permissionCodePlaceholder")}
                          className="w-full"
                          showClear
                        />
                        <ComboboxContent container={container}>
                          <ComboboxEmpty>{t("access.menu.form.noPermissionMatch")}</ComboboxEmpty>
                          <ComboboxList>
                            {(item) => (
                              <ComboboxItem key={item.code} value={item}>
                                <div className="flex flex-col">
                                  <span>{item.code}</span>
                                  <span className="text-muted-foreground text-xs">{item.name}</span>
                                </div>
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
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("access.menu.form.parentMenu")}</FormLabel>
                    <Select
                      value={field.value || "root"}
                      onValueChange={(value) =>
                        field.onChange(value === "root" ? undefined : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("access.menu.form.parentMenuPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="root">{t("access.menu.form.noParent")}</SelectItem>
                        {allowedParentMenus.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("access.menu.form.menuType")}</FormLabel>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(Number(value) as MenuType)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allowedMenuTypes.map((type) => (
                          <SelectItem key={type} value={type.toString()}>
                            {MenuTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isHidden"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("access.menu.form.hidden")}</FormLabel>
                      <FormControl>
                        <div className="flex h-9 items-center">
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("access.menu.form.sort")}</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={0} max={9999} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="bg-background absolute bottom-0 left-0 w-full flex-row justify-end rounded-b-lg p-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  {t("access.menu.form.cancel")}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2Icon className="animate-spin" />}
                  {isEdit ? t("access.menu.form.save") : t("access.menu.form.create")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

type MenuTreeItemProps = {
  menu: Menu;
  level?: number;
  onEdit?: (menu: Menu) => void;
  onDelete?: (menu: Menu) => void;
  onCreateChild?: (parentMenu: Menu) => void;
};

const MenuTreeItem = ({ menu, level = 0, onEdit, onDelete, onCreateChild }: MenuTreeItemProps) => {
  const hasChildren = menu.children && menu.children.length > 0;
  const Icon = MenuTypeIcons[menu.type] || MenuIcon;

  const content = (
    <div className="hover:bg-muted/50 group/menu-item flex h-9 items-center gap-2 rounded-md px-2 py-1.5 text-sm">
      {!hasChildren && <div className="w-6" />}

      {menu.icon ? (
        <LucideIcon
          name={
            (menu.icon && menu.icon.startsWith("i-lucide-")
              ? menu.icon.replace("i-lucide-", "")
              : menu.icon) as IconName
          }
          className="size-4 shrink-0"
        />
      ) : (
        <Icon className="text-muted-foreground size-4 shrink-0" />
      )}

      <span className="flex items-center gap-1 truncate">
        <span className="">{menu.name}</span>
        {(menu.type === MenuType.DIRECTORY || menu.type === MenuType.MENU) && (
          <span className="text-muted-foreground">(/{menu.path})</span>
        )}
      </span>
      {/* {menu.code && (
        <code className="text-muted-foreground max-w-32 truncate text-xs">{menu.code}</code>
      )} */}
      {menu.isHidden === 1 && <EyeOffIcon className="text-muted-foreground size-3.5" />}
      <Badge variant="outline" className="text-xs">
        {MenuTypeLabels[menu.type]}
      </Badge>
      <div className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover/menu-item:opacity-100">
        <PermissionGuard permissions="menu:create">
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-6"
            onClick={() => onCreateChild?.(menu)}
          >
            <PlusIcon />
          </Button>
        </PermissionGuard>
        <PermissionGuard permissions="menu:update">
          <Button variant="ghost" size="icon-sm" className="size-6" onClick={() => onEdit?.(menu)}>
            <PencilIcon />
          </Button>
        </PermissionGuard>
        <PermissionGuard permissions="menu:delete">
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-6"
            onClick={() => onDelete?.(menu)}
          >
            <TrashIcon />
          </Button>
        </PermissionGuard>
      </div>
    </div>
  );

  if (!hasChildren) {
    return <div style={{ paddingLeft: level * 24 }}>{content}</div>;
  }

  return (
    <Collapsible>
      <div style={{ paddingLeft: level * 24 }}>
        <div className="group/menu-item hover:bg-muted/50 flex h-9 w-full items-center gap-2 rounded-md px-2">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-6 shrink-0 data-[state=open]:rotate-90"
            >
              <ChevronRightIcon className="size-4 transition-transform" />
            </Button>
          </CollapsibleTrigger>
          {menu.icon ? (
            <LucideIcon
              name={
                (menu.icon && menu.icon.startsWith("i-lucide-")
                  ? menu.icon.replace("i-lucide-", "")
                  : menu.icon) as IconName
              }
              className="size-4 shrink-0"
            />
          ) : (
            <Icon className="text-muted-foreground size-4 shrink-0" />
          )}
          <span className="flex items-center gap-1 truncate text-sm">
            <span className="">{menu.name}</span>
            {(menu.type === MenuType.DIRECTORY || menu.type === MenuType.MENU) && (
              <span className="text-muted-foreground">(/{menu.path})</span>
            )}
          </span>

          {/* {menu.code && (
            <code className="text-muted-foreground max-w-32 truncate text-xs">{menu.code}</code>
          )} */}
          {menu.isHidden === 1 && <EyeOffIcon className="text-muted-foreground size-3.5" />}
          <Badge variant="outline" className="text-xs">
            {MenuTypeLabels[menu.type]}
          </Badge>
          {/* <Badge variant="secondary" className="text-xs">
            {menu.children?.length}
          </Badge> */}
          <div className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover/menu-item:opacity-100">
            <PermissionGuard permissions="menu:create">
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-6"
                onClick={() => onCreateChild?.(menu)}
              >
                <PlusIcon />
              </Button>
            </PermissionGuard>
            <PermissionGuard permissions="menu:update">
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-6"
                onClick={() => onEdit?.(menu)}
              >
                <PencilIcon />
              </Button>
            </PermissionGuard>
            <PermissionGuard permissions="menu:delete">
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-6"
                onClick={() => onDelete?.(menu)}
              >
                <TrashIcon />
              </Button>
            </PermissionGuard>
          </div>
        </div>
      </div>
      <CollapsibleContent>
        {menu.children?.map((child) => (
          <MenuTreeItem
            key={child.id}
            menu={child}
            level={level + 1}
            onEdit={onEdit}
            onDelete={onDelete}
            onCreateChild={onCreateChild}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

const AccessMenuIndexPage = () => {
  const { t } = useI18n();
  const [keyword, setKeyword] = useState<string>("");

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | undefined>();
  const [parentMenuId, setParentMenuId] = useState<string | undefined>();
  const { confirm } = useAlertDialog();

  const { data: menuTree, isLoading, refetch } = useMenuTreeQuery();
  const deleteMutation = useDeleteMenuMutation();

  const handleKeywordChange = useDebounceCallback((value: string) => {
    setKeyword(value);
  }, 300);

  const filteredMenuTree = useMemo(() => {
    if (!menuTree || !keyword) return menuTree;

    const filterMenu = (menus: Menu[]): Menu[] => {
      return menus
        .map((menu) => {
          const children = menu.children ? filterMenu(menu.children) : [];
          const matchesKeyword =
            menu.name.toLowerCase().includes(keyword.toLowerCase()) ||
            menu.code?.toLowerCase().includes(keyword.toLowerCase());

          if (matchesKeyword || children.length > 0) {
            return { ...menu, children };
          }
          return null;
        })
        .filter(Boolean) as Menu[];
    };

    return filterMenu(menuTree);
  }, [menuTree, keyword]);

  const handleCreate = useCallback(() => {
    setEditingMenu(undefined);
    setParentMenuId(undefined);
    setFormDialogOpen(true);
  }, []);

  const handleCreateChild = useCallback((parentMenu: Menu) => {
    setEditingMenu(undefined);
    setParentMenuId(parentMenu.id);
    setFormDialogOpen(true);
  }, []);

  const handleEdit = useCallback((menu: Menu) => {
    setEditingMenu(menu);
    setFormDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (menu: Menu) => {
      try {
        await confirm({
          title: t("access.menu.alert.deleteTitle"),
          description: t("access.menu.alert.deleteDesc", { name: menu.name }),
          confirmText: t("access.menu.alert.deleteConfirm"),
          confirmVariant: "destructive",
        });

        const result = await deleteMutation.mutateAsync(menu.id);
        if (result.success) {
          toast.success(t("access.menu.toast.deleteSuccess"));
          refetch();
        } else {
          toast.error(result.message || t("access.menu.toast.deleteFailed"));
        }
      } catch {
        // User cancelled or error occurred
      }
    },
    [confirm, deleteMutation, refetch, t],
  );

  return (
    <PageContainer>
      <div className="flex flex-1 flex-col gap-4">
        <div className="bg-background sticky top-0 z-2 flex items-center gap-4 pt-1 pb-2">
          <Input
            placeholder={t("access.menu.searchPlaceholder")}
            className="max-w-xs text-sm"
            onChange={(e) => handleKeywordChange(e.target.value)}
          />
          <div className="flex-1" />
          <PermissionGuard permissions="menu:create">
            <Button size="sm" onClick={handleCreate}>
              <PlusIcon />
              {t("access.menu.createMenu")}
            </Button>
          </PermissionGuard>
        </div>

        <div className="flex flex-col gap-0.5">
          {isLoading ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
              {t("access.menu.table.loading")}
            </div>
          ) : filteredMenuTree && filteredMenuTree.length > 0 ? (
            filteredMenuTree.map((menu) => (
              <MenuTreeItem
                key={menu.id}
                menu={menu}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onCreateChild={handleCreateChild}
              />
            ))
          ) : (
            <div className="text-muted-foreground py-8 text-center text-sm">
              {t("access.menu.table.noData")}
            </div>
          )}
        </div>
      </div>

      <MenuFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        menu={editingMenu}
        parentId={parentMenuId}
        menuTree={menuTree}
        onSuccess={() => {
          refetch();
          setFormDialogOpen(false);
          setParentMenuId(undefined);
        }}
      />
    </PageContainer>
  );
};

export default AccessMenuIndexPage;
