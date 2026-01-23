import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import {
  type Secret,
  type SecretFieldValue,
  type SecretTemplate,
  useAllSecretTemplatesQuery,
  useCreateSecretMutation,
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
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { IconCircleCheckFilled, IconXboxXFilled } from "@tabler/icons-react";
import {
  Check,
  ChevronRight,
  Edit,
  EllipsisVertical,
  FileJson2,
  Info,
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
type EditingField = {
  secretId: string;
  fieldName: string;
  value: string;
  originalValue: string;
};

type NewSecretRow = {
  name: string;
  fieldValues: Record<string, string>;
};

const SecretsManageContent = ({ template }: SecretsManageContentProps) => {
  const { confirm } = useAlertDialog();
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [hasError, setHasError] = useState(false);
  const [newRow, setNewRow] = useState<NewSecretRow | null>(null);
  const [newRowErrors, setNewRowErrors] = useState<Set<string>>(new Set());

  const { data: secrets, refetch, isLoading } = useSecretsByTemplateQuery(template.id, false);

  const updateSecretMutation = useUpdateSecretMutation({
    onSuccess: () => {
      toast.success("密钥已更新");
      setEditingField(null);
      setHasError(false);
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

  const createSecretMutation = useCreateSecretMutation({
    onSuccess: () => {
      toast.success("密钥已创建");
      setNewRow(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const handleAddRow = () => {
    const initialFieldValues: Record<string, string> = {};
    template.fieldConfig?.forEach((field) => {
      initialFieldValues[field.name] = "";
    });
    setNewRow({ name: "", fieldValues: initialFieldValues });
  };

  const handleCancelNewRow = () => {
    setNewRow(null);
    setNewRowErrors(new Set());
  };

  const handleSaveNewRow = () => {
    if (!newRow) return;
    const errors = new Set<string>();
    if (!newRow.name.trim()) {
      errors.add("__name__");
    }
    template.fieldConfig?.forEach((field) => {
      if (field.required && !newRow.fieldValues[field.name]?.trim()) {
        errors.add(field.name);
      }
    });
    if (errors.size > 0) {
      setNewRowErrors(errors);
      toast.error("请填写必填项");
      return;
    }
    setNewRowErrors(new Set());
    const fieldValues: SecretFieldValue[] =
      template.fieldConfig?.map((field) => ({
        name: field.name,
        value: newRow.fieldValues[field.name] || "",
      })) || [];
    createSecretMutation.mutate({
      name: newRow.name,
      templateId: template.id,
      fieldValues,
    });
  };

  const handleFieldFocus = (secret: Secret, fieldName: string, currentValue: string) => {
    if (editingField?.secretId === secret.id && editingField?.fieldName === fieldName) return;
    setEditingField({
      secretId: secret.id,
      fieldName,
      value: currentValue,
      originalValue: currentValue,
    });
    setHasError(false);
  };

  const handleFieldChange = (value: string) => {
    if (!editingField) return;
    setEditingField({ ...editingField, value });
    if (hasError) setHasError(false);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setHasError(false);
  };

  const handleSaveField = (secret: Secret, inputRef?: HTMLInputElement | null) => {
    if (!editingField || editingField.secretId !== secret.id) return;
    if (editingField.fieldName === "__name__") return;
    if (editingField.value === editingField.originalValue) {
      setEditingField(null);
      if (inputRef) setTimeout(() => inputRef.blur(), 0);
      return;
    }
    const fieldConfig = template.fieldConfig?.find((f) => f.name === editingField.fieldName);
    if (fieldConfig?.required && !editingField.value.trim()) {
      toast.error(`${editingField.fieldName} 为必填项`);
      setHasError(true);
      return;
    }
    setHasError(false);
    const fieldValues: SecretFieldValue[] = (secret.fieldValues || []).map((fv) => ({
      name: fv.name,
      value: fv.name === editingField.fieldName ? editingField.value : fv.value,
    }));
    updateSecretMutation.mutate({
      id: secret.id,
      data: { fieldValues },
    });
  };

  const handleFieldBlur = (secret: Secret, e: React.FocusEvent<HTMLInputElement>) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget?.tagName === "INPUT") return;
    handleSaveField(secret);
  };

  const handleSaveName = (secret: Secret, inputRef?: HTMLInputElement | null) => {
    if (
      !editingField ||
      editingField.secretId !== secret.id ||
      editingField.fieldName !== "__name__"
    )
      return;
    if (editingField.value === editingField.originalValue) {
      setEditingField(null);
      if (inputRef) setTimeout(() => inputRef.blur(), 0);
      return;
    }
    if (!editingField.value.trim()) {
      toast.error("名称为必填项");
      setHasError(true);
      return;
    }
    setHasError(false);
    updateSecretMutation.mutate({
      id: secret.id,
      data: { name: editingField.value },
    });
  };

  const handleNameBlur = (secret: Secret, e: React.FocusEvent<HTMLInputElement>) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget?.tagName === "INPUT") return;
    handleSaveName(secret);
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

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {template.name} - 密钥列表({secrets?.length}个)
        </DialogTitle>

        <DialogDescription className="flex items-center text-xs">
          <Info className="size-3" />
          点击字段项进行修改
        </DialogDescription>
      </DialogHeader>
      <ScrollArea className="max-h-96">
        {isLoading ? (
          <div>加载中...</div>
        ) : (secrets && secrets.length > 0) || newRow ? (
          <div className="flex gap-1">
            <div className="flex w-[100px] flex-col">
              <span className="text-muted-foreground mb-2 px-2 text-xs">名称</span>
              {secrets?.map((secret) => {
                const isEditingName =
                  editingField?.secretId === secret.id && editingField?.fieldName === "__name__";
                return (
                  <div
                    key={secret.id}
                    className={`group/name-item hover:bg-muted focus-within:bg-muted flex h-9 items-center border px-2 ${isEditingName && hasError ? "border-destructive focus-within:bg-destructive/10 bg-destructive/10" : "focus-within:border-input border-transparent"}`}
                  >
                    <Input
                      value={isEditingName ? editingField.value : secret.name}
                      className="h-full w-full border-0 border-none bg-transparent px-0 shadow-none ring-0 focus-within:ring-0 focus-visible:ring-0"
                      onFocus={() => handleFieldFocus(secret, "__name__", secret.name)}
                      onChange={(e) => handleFieldChange(e.target.value)}
                      onBlur={(e) => handleNameBlur(secret, e)}
                      disabled={updateSecretMutation.isPending}
                    />
                    {isEditingName && (
                      <div className="flex items-center gap-0">
                        <Button
                          className="hover:bg-muted-foreground/10 size-5 border-0"
                          variant="ghost"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const inputEl = e.currentTarget.parentElement
                              ?.previousElementSibling as HTMLInputElement;
                            handleSaveName(secret, inputEl);
                          }}
                          disabled={updateSecretMutation.isPending}
                        >
                          <Check className="size-3" />
                        </Button>
                        <Button
                          className="hover:bg-muted-foreground/10 size-5 border-0"
                          variant="ghost"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleCancelEdit();
                            const inputEl = e.currentTarget.parentElement
                              ?.previousElementSibling as HTMLInputElement;
                            setTimeout(() => inputEl?.blur(), 0);
                          }}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
              {newRow && (
                <div
                  className={`flex h-9 items-center border px-2 ${newRowErrors.has("__name__") ? "border-destructive bg-destructive/10" : "border-transparent"}`}
                >
                  <Input
                    value={newRow.name}
                    placeholder="请输入名称"
                    className="h-full w-full border-0 border-none bg-transparent px-0 shadow-none ring-0 focus-within:ring-0 focus-visible:ring-0"
                    onChange={(e) => {
                      setNewRow({ ...newRow, name: e.target.value });
                      if (newRowErrors.has("__name__")) {
                        const next = new Set(newRowErrors);
                        next.delete("__name__");
                        setNewRowErrors(next);
                      }
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col">
              <div className="flex w-full justify-between">
                {template.fieldConfig?.map((field) => (
                  <span className="text-muted-foreground mb-2 flex-1 px-2 text-xs" key={field.name}>
                    {field.name}
                    <span className="text-destructive">{field.required ? "*" : ""}</span>
                  </span>
                ))}
              </div>
              {secrets?.map((secret) => (
                <div
                  key={secret.id}
                  className="flex h-9 w-full cursor-pointer justify-between text-sm break-all"
                >
                  {secret.fieldValues?.map((field) => {
                    const isEditing =
                      editingField?.secretId === secret.id &&
                      editingField?.fieldName === field.name;
                    return (
                      <div
                        key={field.name}
                        className={`group/field-item hover:bg-muted focus-within:bg-muted flex h-full flex-1 items-center border px-2 ${isEditing && hasError ? "border-destructive bg-destructive/10 focus-within:bg-destructive/10" : "focus-within:border-input border-transparent"}`}
                      >
                        <Input
                          value={isEditing ? editingField.value : field.value || ""}
                          placeholder={`请输入${field.name}`}
                          className="h-full w-full border-0 border-none bg-transparent px-0 shadow-none ring-0 focus-within:ring-0 focus-visible:ring-0"
                          onFocus={() => handleFieldFocus(secret, field.name, field.value || "")}
                          onChange={(e) => handleFieldChange(e.target.value)}
                          onBlur={(e) => handleFieldBlur(secret, e)}
                          disabled={updateSecretMutation.isPending}
                        />
                        {isEditing && (
                          <div className="flex items-center gap-0">
                            <Button
                              className="hover:bg-muted-foreground/10 size-5 border-0"
                              variant="ghost"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                const inputEl = e.currentTarget.parentElement
                                  ?.previousElementSibling as HTMLInputElement;
                                handleSaveField(secret, inputEl);
                              }}
                              disabled={updateSecretMutation.isPending}
                            >
                              <Check className="size-3" />
                            </Button>
                            <Button
                              className="hover:bg-muted-foreground/10 size-5 border-0"
                              variant="ghost"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleCancelEdit();
                                const inputEl = e.currentTarget.parentElement
                                  ?.previousElementSibling as HTMLInputElement;
                                setTimeout(() => inputEl?.blur(), 0);
                              }}
                            >
                              <X className="size-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              {newRow && (
                <div className="flex h-9 w-full justify-between text-sm break-all">
                  {template.fieldConfig?.map((field) => (
                    <div
                      key={field.name}
                      className={`flex h-full flex-1 items-center border px-2 ${newRowErrors.has(field.name) ? "border-destructive bg-destructive/10" : "border-transparent"}`}
                    >
                      <Input
                        value={newRow.fieldValues[field.name] || ""}
                        placeholder={`请输入${field.name}`}
                        className="h-full w-full border-0 border-none bg-transparent px-0 shadow-none ring-0 focus-within:ring-0 focus-visible:ring-0"
                        onChange={(e) => {
                          setNewRow({
                            ...newRow,
                            fieldValues: { ...newRow.fieldValues, [field.name]: e.target.value },
                          });
                          if (newRowErrors.has(field.name)) {
                            const next = new Set(newRowErrors);
                            next.delete(field.name);
                            setNewRowErrors(next);
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex w-12 flex-col">
              <span className="text-muted-foreground mb-2 text-xs">状态</span>
              {secrets?.map((secret) => (
                <div key={secret.id} className="flex h-9 items-center">
                  <Switch
                    checked={secret.status === BooleanNumber.YES}
                    onCheckedChange={() => handleToggleStatus(secret)}
                    disabled={setStatusMutation.isPending}
                  />
                </div>
              ))}
              {newRow && <div className="flex h-9 items-center" />}
            </div>
            <div className="flex w-16 flex-col">
              <span className="text-muted-foreground end mb-2 text-xs">操作</span>
              {secrets?.map((secret) => (
                <div key={secret.id} className="end flex h-9 items-center">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleDelete(secret)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              {newRow && (
                <div className="end flex h-9 items-center">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={handleSaveNewRow}
                    disabled={createSecretMutation.isPending}
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={handleCancelNewRow}>
                    <X className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="center text-muted-foreground p-8 text-sm">no data</div>
        )}
        <div className="mt-4 flex justify-end">
          <Button size="sm" variant="outline" onClick={handleAddRow} disabled={!!newRow}>
            <Plus className="size-4" />
            添加
          </Button>
        </div>
      </ScrollArea>
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
      <DialogContent className="sm:max-w-5xl" onOpenAutoFocus={(e) => e.preventDefault()}>
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
