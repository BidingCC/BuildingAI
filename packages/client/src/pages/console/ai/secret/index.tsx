import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import {
  type Secret,
  type SecretFieldValue,
  type SecretTemplate,
  type SecretTemplateFieldConfig,
  useAllSecretTemplatesQuery,
  useDeleteSecretMutation,
  useDeleteSecretTemplateMutation,
  useSecretsByTemplateQuery,
  useSetSecretStatusMutation,
  useSetSecretTemplateEnabledMutation,
  useUpdateSecretMutation,
} from "@buildingai/services/console";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@buildingai/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { Switch } from "@buildingai/ui/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@buildingai/ui/components/ui/table";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { IconCircleCheckFilled, IconXboxXFilled } from "@tabler/icons-react";
import {
  Check,
  ChevronRight,
  Edit,
  EllipsisVertical,
  FileJson2,
  KeyRound,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type StatusBadgeProps = {
  isEnabled: boolean;
};

/**
 * Reusable status badge component
 */
const StatusBadge = ({ isEnabled }: StatusBadgeProps) =>
  isEnabled ? (
    <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
      <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
      启用
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
      <IconXboxXFilled className="fill-destructive" />
      禁用
    </Badge>
  );

type SecretsManageDialogProps = {
  template: SecretTemplate;
};

type SecretsManageContentProps = {
  template: SecretTemplate;
};

/**
 * Content component for secrets management (only rendered when dialog is open)
 */
const SecretsManageContent = ({ template }: SecretsManageContentProps) => {
  const { confirm } = useAlertDialog();
  const [editingSecretId, setEditingSecretId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const { data: secrets, refetch, isLoading } = useSecretsByTemplateQuery(template.id, false);

  const updateSecretMutation = useUpdateSecretMutation({
    onSuccess: () => {
      toast.success("密钥已更新");
      setEditingSecretId(null);
      setEditingValues({});
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const setStatusMutation = useSetSecretStatusMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.status === BooleanNumber.YES ? "密钥已启用" : "密钥已禁用");
      refetch();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  const deleteMutation = useDeleteSecretMutation({
    onSuccess: () => {
      toast.success("密钥已删除");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const handleStartEdit = (secret: Secret) => {
    setEditingSecretId(secret.id);
    const values: Record<string, string> = {};
    secret.fieldValues?.forEach((fv) => {
      values[fv.name] = fv.value;
    });
    setEditingValues(values);
  };

  const handleCancelEdit = () => {
    setEditingSecretId(null);
    setEditingValues({});
  };

  const handleSaveEdit = (secret: Secret) => {
    const fieldValues: SecretFieldValue[] = template.fieldConfig.map((field) => ({
      name: field.name,
      value: editingValues[field.name] || "",
    }));
    updateSecretMutation.mutate({
      id: secret.id,
      data: { fieldValues },
    });
  };

  const handleToggleStatus = async (secret: Secret) => {
    const newStatus = secret.status === BooleanNumber.YES ? BooleanNumber.NO : BooleanNumber.YES;
    await confirm({
      title: "密钥状态",
      description: `确定要${newStatus === BooleanNumber.YES ? "启用" : "禁用"}该密钥吗？`,
    });
    setStatusMutation.mutate({ id: secret.id, status: newStatus });
  };

  const handleDelete = async (secret: Secret) => {
    await confirm({
      title: "删除密钥",
      description: "确定要删除该密钥配置吗？此操作不可恢复。",
    });
    deleteMutation.mutate(secret.id);
  };

  const getFieldValue = (secret: Secret, fieldName: string) => {
    const field = secret.fieldValues?.find((fv) => fv.name === fieldName);
    if (!field) return "-";
    return field.value || "-";
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{template.name} - 密钥列表</DialogTitle>
        <DialogDescription>管理该模板下的所有密钥配置</DialogDescription>
      </DialogHeader>
      <div className="max-h-96 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">名称</TableHead>
              {template.fieldConfig?.map((field) => (
                <TableHead key={field.name}>{field.name}</TableHead>
              ))}
              <TableHead className="w-[80px]">状态</TableHead>
              <TableHead className="w-[100px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={(template.fieldConfig?.length || 0) + 3}
                  className="text-center"
                >
                  加载中...
                </TableCell>
              </TableRow>
            ) : secrets && secrets.length > 0 ? (
              secrets.map((secret) => (
                <TableRow key={secret.id}>
                  <TableCell className="font-medium">{secret.name}</TableCell>
                  {template.fieldConfig?.map((field) => (
                    <TableCell key={field.name}>
                      {editingSecretId === secret.id ? (
                        <Input
                          value={editingValues[field.name] || ""}
                          onChange={(e) =>
                            setEditingValues((prev) => ({
                              ...prev,
                              [field.name]: e.target.value,
                            }))
                          }
                          placeholder={field.placeholder || `请输入${field.name}`}
                          className="h-8"
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {getFieldValue(secret, field.name)}
                        </span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Switch
                      checked={secret.status === BooleanNumber.YES}
                      onCheckedChange={() => handleToggleStatus(secret)}
                      disabled={setStatusMutation.isPending}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {editingSecretId === secret.id ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => handleSaveEdit(secret)}
                          disabled={updateSecretMutation.isPending}
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={handleCancelEdit}>
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon-sm" variant="ghost">
                            <EllipsisVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStartEdit(secret)}>
                            <Edit />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(secret)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={(template.fieldConfig?.length || 0) + 3}
                  className="text-muted-foreground text-center"
                >
                  暂无密钥配置
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

/**
 * Dialog trigger component for managing secrets of a template
 */
const SecretsManageDialog = ({ template }: SecretsManageDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="xs" className="text-muted-foreground px-0 hover:px-2">
          <Settings />
          管理密钥({template.Secrets?.length || 0})
          <ChevronRight />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        {isOpen && <SecretsManageContent template={template} />}
      </DialogContent>
    </Dialog>
  );
};

const AiSecretIndexPage = () => {
  const { confirm } = useAlertDialog();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: templates, refetch, isLoading } = useAllSecretTemplatesQuery();

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.filter((template) => {
      const matchKeyword =
        !searchKeyword || template.name.toLowerCase().includes(searchKeyword.toLowerCase());
      const matchStatus =
        statusFilter === "all" ||
        template.isEnabled === (statusFilter === "enabled" ? BooleanNumber.YES : BooleanNumber.NO);
      return matchKeyword && matchStatus;
    });
  }, [templates, searchKeyword, statusFilter]);

  const setEnabledMutation = useSetSecretTemplateEnabledMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.isEnabled === BooleanNumber.YES ? "模板已启用" : "模板已禁用");
      refetch();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  const deleteMutation = useDeleteSecretTemplateMutation({
    onSuccess: () => {
      toast.success("模板已删除");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const handleToggleEnabled = async (template: SecretTemplate) => {
    const newStatus =
      template.isEnabled === BooleanNumber.YES ? BooleanNumber.NO : BooleanNumber.YES;
    await confirm({
      title: "模板状态",
      description: `确定要${newStatus === BooleanNumber.YES ? "启用" : "禁用"}该模板吗？`,
    });
    setEnabledMutation.mutate({ id: template.id, isEnabled: newStatus });
  };

  const handleDelete = async (template: SecretTemplate) => {
    await confirm({
      title: "删除模板",
      description: "确定要删除该密钥模板吗？此操作不可恢复。",
    });
    deleteMutation.mutate(template.id);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-background sticky top-0 z-1 grid grid-cols-1 gap-4 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <Input placeholder="搜索模板名称或代码" className="text-sm" onChange={handleSearchChange} />
        <Select onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="模板状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="enabled">已启用</SelectItem>
            <SelectItem value="disabled">已禁用</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <div className="flex flex-col gap-4 rounded-lg border border-dashed p-4 hover:border-solid">
          <div className="flex items-center gap-3">
            <Button className="size-12 rounded-lg border-dashed" variant="outline">
              <Plus />
            </Button>
            <div className="flex flex-col">
              <span>新增密钥模板</span>
              <span className="text-muted-foreground py-1 text-xs font-medium">
                添加新的密钥模板
              </span>
            </div>
          </div>

          <div className="mt-auto flex gap-4">
            <Button size="xs" className="flex-1" variant="outline">
              <FileJson2 /> 从配置导入
            </Button>
            <Button size="xs" className="flex-1" variant="outline">
              <Plus /> 手动创建
            </Button>
          </div>
        </div>

        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-card flex h-28 flex-col gap-4 rounded-lg border p-4">
              <div className="flex gap-3">
                <Skeleton className="size-12 rounded-lg" />
                <div className="flex h-full flex-1 flex-col justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-2 h-4 w-full" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          ))
        ) : filteredTemplates.length > 0 ? (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="group/secret-item bg-card relative flex flex-col gap-2 rounded-lg border p-4"
            >
              <div className="flex items-center gap-3">
                <Avatar className="relative size-12 rounded-lg after:rounded-lg">
                  <AvatarImage
                    src={template.icon || ""}
                    alt={template.name}
                    className="rounded-lg"
                  />
                  <AvatarFallback className="size-12 rounded-lg">
                    <KeyRound className="size-6" />
                  </AvatarFallback>
                  <div className="center absolute inset-0 z-1 rounded-lg bg-black/5 opacity-0 backdrop-blur-xl transition-opacity group-hover/secret-item:opacity-100 dark:bg-black/15">
                    <Switch
                      checked={template.isEnabled === BooleanNumber.YES}
                      onCheckedChange={() => handleToggleEnabled(template)}
                      disabled={setEnabledMutation.isPending}
                    />
                  </div>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                  <span className="line-clamp-1">{template.name}</span>
                  <SecretsManageDialog template={template} />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="absolute top-2 right-2" size="icon-sm" variant="ghost">
                      <EllipsisVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <Edit />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => handleDelete(template)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge isEnabled={template.isEnabled === BooleanNumber.YES} />
                {template.fieldConfig?.map((field) => (
                  <Badge key={field.name} variant="secondary">
                    {field.name}
                  </Badge>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-1 flex h-28 items-center justify-center gap-4 sm:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-5">
            <span className="text-muted-foreground text-sm">
              {searchKeyword ? `没有找到与"${searchKeyword}"相关的模板` : "暂无密钥模板数据"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiSecretIndexPage;
