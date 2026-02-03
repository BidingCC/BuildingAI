import {
  type CreateMenuParams,
  type Menu,
  MenuSourceType,
  MenuType,
  type UpdateMenuParams,
  useCreateMenuMutation,
  useDeleteMenuMutation,
  useMenuTreeQuery,
  useUpdateMenuMutation,
} from "@buildingai/services/console";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@buildingai/ui/components/ui/alert-dialog";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@buildingai/ui/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@buildingai/ui/components/ui/field";
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
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useDebounceCallback } from "usehooks-ts";
import { z } from "zod";

import { PageContainer } from "@/layouts/console/_components/page-container";

const MenuTypeLabels: Record<MenuType, string> = {
  [MenuType.GROUP]: "分组",
  [MenuType.DIRECTORY]: "目录",
  [MenuType.MENU]: "菜单",
  [MenuType.BUTTON]: "按钮",
};

const MenuTypeIcons: Record<MenuType, React.ElementType> = {
  [MenuType.GROUP]: LayoutGridIcon,
  [MenuType.DIRECTORY]: FolderIcon,
  [MenuType.MENU]: FileIcon,
  [MenuType.BUTTON]: MousePointerClickIcon,
};

const MenuSourceTypeLabels: Record<MenuSourceType, string> = {
  [MenuSourceType.SYSTEM]: "系统",
  [MenuSourceType.PLUGIN]: "插件",
};

const menuFormSchema = z.object({
  name: z.string().min(1, "菜单名称不能为空").max(50, "菜单名称不能超过50个字符"),
  code: z.string().max(50, "编码不能超过50个字符"),
  path: z.string().max(100, "路径不能超过100个字符"),
  icon: z.string().max(50, "图标不能超过50个字符"),
  component: z.string().max(100, "组件路径不能超过100个字符"),
  permissionCode: z.string().max(100, "权限编码不能超过100个字符"),
  sort: z.coerce.number().min(0, "排序值不能小于0").max(9999, "排序值不能大于9999"),
  isHidden: z.boolean(),
  type: z.nativeEnum(MenuType),
  sourceType: z.nativeEnum(MenuSourceType),
  parentId: z.string().optional().nullable(),
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
  sourceType: MenuSourceType.SYSTEM,
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

  const form = useForm<MenuFormData>({
    resolver: zodResolver(menuFormSchema as any),
    defaultValues: defaultFormValues,
  });

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
          sourceType: menu.sourceType,
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
      sourceType: data.sourceType,
      parentId: data.parentId || undefined,
    };

    try {
      if (isEdit && menu) {
        await updateMutation.mutateAsync({
          id: menu.id,
          data: payload as UpdateMenuParams,
        });
        toast.success("菜单更新成功");
      } else {
        await createMutation.mutateAsync(payload as CreateMenuParams);
        toast.success("菜单创建成功");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(isEdit ? "更新失败" : "创建失败");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{isEdit ? "编辑菜单" : "新建菜单"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <form
            id="menu-form"
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.error("Form validation errors:", errors);
            })}
            className="p-4 pb-20"
          >
            <FieldGroup className="gap-4">
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>菜单名称 *</FieldLabel>
                    <Input
                      {...field}
                      placeholder="请输入菜单名称"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="code"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>编码</FieldLabel>
                    <Input
                      {...field}
                      placeholder="唯一标识，如 system:menu:list"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="path"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>路径</FieldLabel>
                    <Input
                      {...field}
                      placeholder="/example/path"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="icon"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>图标</FieldLabel>
                    <Input {...field} placeholder="图标名称" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="component"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>组件路径</FieldLabel>
                    <Input {...field} placeholder="组件路径" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="permissionCode"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>权限编码</FieldLabel>
                    <Input
                      {...field}
                      placeholder="关联权限编码"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="parentId"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>父级菜单</FieldLabel>
                    <Select
                      value={field.value || "root"}
                      onValueChange={(value) =>
                        field.onChange(value === "root" ? undefined : value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择父级菜单" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="root">无（顶级菜单）</SelectItem>
                        {flatMenuList
                          .filter((m) => m.id !== menu?.id)
                          .map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="type"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>菜单类型</FieldLabel>
                      <Select
                        value={field.value.toString()}
                        onValueChange={(value) => field.onChange(Number(value) as MenuType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(MenuTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
                <Controller
                  name="sourceType"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>来源类型</FieldLabel>
                      <Select
                        value={field.value.toString()}
                        onValueChange={(value) => field.onChange(Number(value) as MenuSourceType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(MenuSourceTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="sort"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>排序</FieldLabel>
                      <Input
                        type="number"
                        {...field}
                        min={0}
                        max={9999}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="isHidden"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>隐藏菜单</FieldLabel>
                      <div className="flex h-9 items-center">
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>
            <DialogFooter className="bg-background absolute bottom-0 left-0 w-full flex-row justify-end rounded-b-lg p-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2Icon className="animate-spin" />}
                {isEdit ? "保存" : "创建"}
              </Button>
            </DialogFooter>
          </form>
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
};

const MenuTreeItem = ({ menu, level = 0, onEdit, onDelete }: MenuTreeItemProps) => {
  const hasChildren = menu.children && menu.children.length > 0;
  const Icon = MenuTypeIcons[menu.type] || MenuIcon;

  const content = (
    <div className="hover:bg-muted/50 group/menu-item flex h-9 items-center gap-2 rounded-md px-2 py-1.5 text-sm">
      {!hasChildren && <div className="w-4" />}
      <Icon className="text-muted-foreground size-4" />
      <span className="flex-1 truncate">{menu.name}</span>
      {menu.code && (
        <code className="text-muted-foreground max-w-32 truncate text-xs">{menu.code}</code>
      )}
      {menu.isHidden === 1 && <EyeOffIcon className="text-muted-foreground size-3.5" />}
      <Badge variant="outline" className="text-xs">
        {MenuTypeLabels[menu.type]}
      </Badge>
      <Badge
        variant={menu.sourceType === MenuSourceType.SYSTEM ? "secondary" : "default"}
        className="text-xs"
      >
        {MenuSourceTypeLabels[menu.sourceType]}
      </Badge>
      <div className="flex gap-1 opacity-0 transition-opacity group-hover/menu-item:opacity-100">
        <Button variant="ghost" size="icon-sm" className="size-6" onClick={() => onEdit?.(menu)}>
          <PencilIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" className="size-6" onClick={() => onDelete?.(menu)}>
          <TrashIcon />
        </Button>
      </div>
    </div>
  );

  if (!hasChildren) {
    return <div style={{ paddingLeft: level * 24 }}>{content}</div>;
  }

  return (
    <Collapsible className="group/collapsible">
      <div style={{ paddingLeft: level * 24 }}>
        <div className="group/menu-item hover:bg-muted/50 flex h-9 w-full items-center gap-2 rounded-md px-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="size-6 shrink-0">
              <ChevronRightIcon className="size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </Button>
          </CollapsibleTrigger>
          <Icon className="text-muted-foreground size-4 shrink-0" />
          <span className="flex-1 truncate text-left text-sm">{menu.name}</span>
          {menu.code && (
            <code className="text-muted-foreground max-w-32 truncate text-xs">{menu.code}</code>
          )}
          {menu.isHidden === 1 && <EyeOffIcon className="text-muted-foreground size-3.5" />}
          <Badge variant="outline" className="text-xs">
            {MenuTypeLabels[menu.type]}
          </Badge>
          <Badge
            variant={menu.sourceType === MenuSourceType.SYSTEM ? "secondary" : "default"}
            className="text-xs"
          >
            {MenuSourceTypeLabels[menu.sourceType]}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {menu.children?.length}
          </Badge>
          <div className="flex gap-1 opacity-0 transition-opacity group-hover/menu-item:opacity-100">
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-6"
              onClick={() => onEdit?.(menu)}
            >
              <PencilIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-6"
              onClick={() => onDelete?.(menu)}
            >
              <TrashIcon />
            </Button>
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
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

const AccessMenuIndexPage = () => {
  const [sourceType, setSourceType] = useState<MenuSourceType | undefined>();
  const [keyword, setKeyword] = useState<string>("");

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMenu, setDeletingMenu] = useState<Menu | undefined>();

  const { data: menuTree, isLoading, refetch } = useMenuTreeQuery(sourceType);
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
    setFormDialogOpen(true);
  }, []);

  const handleEdit = useCallback((menu: Menu) => {
    setEditingMenu(menu);
    setFormDialogOpen(true);
  }, []);

  const handleDelete = useCallback((menu: Menu) => {
    setDeletingMenu(menu);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingMenu) return;

    try {
      const result = await deleteMutation.mutateAsync(deletingMenu.id);
      if (result.success) {
        toast.success("删除成功");
        setDeleteDialogOpen(false);
        setDeletingMenu(undefined);
      } else {
        toast.error(result.message || "删除失败");
      }
    } catch {
      toast.error("删除失败");
    }
  }, [deletingMenu, deleteMutation]);

  return (
    <PageContainer>
      <div className="flex flex-1 flex-col gap-4">
        <div className="bg-background sticky top-0 z-1 flex items-center gap-4 pt-1 pb-2">
          <Input
            placeholder="搜索菜单名称或编码"
            className="max-w-xs text-sm"
            onChange={(e) => handleKeywordChange(e.target.value)}
          />
          <Select
            value={sourceType?.toString() || "all"}
            onValueChange={(value) =>
              setSourceType(value === "all" ? undefined : (Number(value) as MenuSourceType))
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="来源类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部来源</SelectItem>
              <SelectItem value={MenuSourceType.SYSTEM.toString()}>系统菜单</SelectItem>
              <SelectItem value={MenuSourceType.PLUGIN.toString()}>插件菜单</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <Button size="sm" onClick={handleCreate}>
            <PlusIcon />
            新建菜单
          </Button>
        </div>

        <div className="flex flex-col gap-0.5">
          {isLoading ? (
            <div className="text-muted-foreground py-8 text-center text-sm">加载中...</div>
          ) : filteredMenuTree && filteredMenuTree.length > 0 ? (
            filteredMenuTree.map((menu) => (
              <MenuTreeItem key={menu.id} menu={menu} onEdit={handleEdit} onDelete={handleDelete} />
            ))
          ) : (
            <div className="text-muted-foreground py-8 text-center text-sm">暂无菜单数据</div>
          )}
        </div>
      </div>

      <MenuFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        menu={editingMenu}
        menuTree={menuTree}
        onSuccess={() => refetch()}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除菜单「{deletingMenu?.name}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2Icon className="animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
};

export default AccessMenuIndexPage;
