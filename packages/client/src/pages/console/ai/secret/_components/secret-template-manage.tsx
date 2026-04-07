import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import { useI18n } from "@buildingai/i18n";
import {
  type Secret,
  type SecretFieldValue,
  type SecretTemplate,
  useAllSecretTemplatesQuery,
  useCreateSecretMutation,
  useDeleteSecretMutation,
  useDeleteSecretTemplateMutation,
  useImportSecretTemplateJsonMutation,
  useSecretsByTemplateQuery,
  useSetSecretStatusMutation,
  useSetSecretTemplateEnabledMutation,
  useUpdateSecretMutation,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { StatusBadge } from "@buildingai/ui/components/ui/status-badge";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import {
  Check,
  ChevronRight,
  Edit,
  EllipsisVertical,
  FileJson2,
  Info,
  KeyRound,
  Loader2,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";

import { SecretTemplateFormDialog } from "./secret-template-form-dialog";

type SecretsManageDialogProps = {
  template: SecretTemplate;
  onSecretChanged?: () => void;
};

type SecretsManageContentProps = {
  template: SecretTemplate;
  onSecretChanged?: () => void;
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

const SecretsManageContent = ({ template, onSecretChanged }: SecretsManageContentProps) => {
  const { t } = useI18n();
  const { confirm } = useAlertDialog();
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [hasError, setHasError] = useState(false);
  const [newRow, setNewRow] = useState<NewSecretRow | null>(null);
  const [newRowErrors, setNewRowErrors] = useState<Set<string>>(new Set());

  const { data: secrets, refetch, isLoading } = useSecretsByTemplateQuery(template.id, false);

  const updateSecretMutation = useUpdateSecretMutation({
    onSuccess: () => {
      toast.success(t("ai.secret.manage.toast.updateSuccess"));
      setEditingField(null);
      setHasError(false);
      refetch();
      onSecretChanged?.();
    },
    onError: (error) => {
      toast.error(t("ai.secret.manage.toast.updateFailed", { error: error.message }));
    },
  });

  const setStatusMutation = useSetSecretStatusMutation({
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === BooleanNumber.YES
          ? t("ai.secret.manage.toast.secretEnabled")
          : t("ai.secret.manage.toast.secretDisabled"),
      );
      refetch();
      onSecretChanged?.();
    },
  });

  const deleteMutation = useDeleteSecretMutation({
    onSuccess: () => {
      toast.success(t("ai.secret.manage.toast.deleteSuccess"));
      refetch();
      onSecretChanged?.();
    },
    onError: (error) => {
      toast.error(t("ai.secret.manage.toast.deleteFailed", { error: error.message }));
    },
  });

  const createSecretMutation = useCreateSecretMutation({
    onSuccess: () => {
      toast.success(t("ai.secret.manage.toast.createSuccess"));
      setNewRow(null);
      refetch();
      onSecretChanged?.();
    },
    onError: (error) => {
      toast.error(t("ai.secret.manage.toast.createFailed", { error: error.message }));
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
      toast.error(t("ai.secret.manage.form.fillRequired"));
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
      toast.error(t("ai.secret.manage.form.fieldRequired", { field: editingField.fieldName }));
      setHasError(true);
      return;
    }
    setHasError(false);
    const fieldValues: SecretFieldValue[] =
      template.fieldConfig?.map((fc) => ({
        name: fc.name,
        value:
          fc.name === editingField.fieldName
            ? editingField.value
            : secret.fieldValues?.find((fv) => fv.name === fc.name)?.value || "",
      })) || [];
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
      toast.error(t("ai.secret.manage.form.nameRequired"));
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
      title: t("ai.secret.manage.confirm.statusTitle"),
      description: t("ai.secret.manage.confirm.statusDesc", {
        action:
          newStatus === BooleanNumber.YES
            ? t("ai.secret.manage.confirm.enable")
            : t("ai.secret.manage.confirm.disable"),
      }),
    });
    setStatusMutation.mutate({ id: secret.id, status: newStatus });
  };

  const handleDelete = async (secret: Secret) => {
    await confirm({
      title: t("ai.secret.manage.confirm.deleteTitle"),
      description: t("ai.secret.manage.confirm.deleteDesc"),
    });
    deleteMutation.mutate(secret.id);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {t("ai.secret.manage.dialog.title", {
            name: template.name,
            count: secrets?.length || 0,
          })}
        </DialogTitle>

        <DialogDescription className="flex items-center text-xs">
          <Info className="size-3" />
          {t("ai.secret.manage.dialog.clickToEdit")}
        </DialogDescription>
      </DialogHeader>
      <ScrollArea className="max-h-96">
        {isLoading ? (
          <div>{t("ai.secret.manage.dialog.loading")}</div>
        ) : (secrets && secrets.length > 0) || newRow ? (
          <div className="flex gap-1">
            <div className="flex w-[100px] flex-col">
              <span className="text-muted-foreground mb-2 px-2 text-xs">
                {t("ai.secret.manage.column.name")}
                <span className="text-destructive">*</span>
              </span>
              {secrets?.map((secret) => {
                const isEditingName =
                  editingField?.secretId === secret.id && editingField?.fieldName === "__name__";
                return (
                  <div
                    key={secret.id}
                    className={`group/name-item hover:bg-muted focus-within:bg-muted flex h-9 items-center border px-2 ${isEditingName && hasError ? "border-destructive focus-within:bg-destructive/10 bg-destructive/10" : "focus-within:border-input border-transparent"}`}
                  >
                    <PermissionGuard permissions="secret:update" blockOnly>
                      <Input
                        value={isEditingName ? editingField.value : secret.name}
                        className="h-full w-full border-0 border-none bg-transparent! px-0 shadow-none ring-0 focus-within:ring-0 focus-visible:ring-0"
                        onFocus={() => handleFieldFocus(secret, "__name__", secret.name)}
                        onChange={(e) => handleFieldChange(e.target.value)}
                        onBlur={(e) => handleNameBlur(secret, e)}
                        disabled={updateSecretMutation.isPending}
                      />
                    </PermissionGuard>
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
                    placeholder={t("ai.secret.manage.form.secretNamePlaceholder")}
                    className="h-full w-full border-0 border-none bg-transparent! px-0 shadow-none ring-0 focus-within:ring-0 focus-visible:ring-0"
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
                  {template.fieldConfig?.map((fieldConfig) => {
                    const fieldValue = secret.fieldValues?.find(
                      (fv) => fv.name === fieldConfig.name,
                    );
                    const currentValue = fieldValue?.value || "";
                    const isEditing =
                      editingField?.secretId === secret.id &&
                      editingField?.fieldName === fieldConfig.name;
                    return (
                      <div
                        key={fieldConfig.name}
                        className={`group/field-item hover:bg-muted focus-within:bg-muted flex h-full flex-1 items-center border px-2 ${isEditing && hasError ? "border-destructive bg-destructive/10 focus-within:bg-destructive/10" : "focus-within:border-input border-transparent"}`}
                      >
                        <PermissionGuard permissions="secret:update" blockOnly>
                          <Input
                            value={isEditing ? editingField.value : currentValue}
                            placeholder={
                              fieldConfig.placeholder ||
                              t("ai.secret.manage.placeholder.inputField", {
                                field: fieldConfig.name,
                              })
                            }
                            className="h-full w-full border-0 border-none bg-transparent! px-0 shadow-none ring-0 focus-within:ring-0 focus-visible:ring-0"
                            onFocus={() => handleFieldFocus(secret, fieldConfig.name, currentValue)}
                            onChange={(e) => handleFieldChange(e.target.value)}
                            onBlur={(e) => handleFieldBlur(secret, e)}
                            disabled={updateSecretMutation.isPending}
                          />
                        </PermissionGuard>
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
                        placeholder={field.placeholder}
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
              <span className="text-muted-foreground mb-2 text-xs">
                {t("ai.secret.manage.column.status")}
              </span>
              {secrets?.map((secret) => (
                <div key={secret.id} className="flex h-9 items-center">
                  <PermissionGuard permissions="secret:update-status" blockOnly>
                    <Switch
                      checked={secret.status === BooleanNumber.YES}
                      onCheckedChange={() => handleToggleStatus(secret)}
                      disabled={setStatusMutation.isPending}
                    />
                  </PermissionGuard>
                </div>
              ))}
              {newRow && <div className="flex h-9 items-center" />}
            </div>
            <div className="flex w-16 flex-col">
              <span className="text-muted-foreground end mb-2 text-xs">
                {t("ai.secret.manage.column.action")}
              </span>
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
                  <PermissionGuard permissions="secret:delete" blockOnly>
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
                  </PermissionGuard>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="center text-muted-foreground p-8 text-sm">
            {t("ai.secret.manage.dialog.empty")}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <PermissionGuard permissions="secret:create">
            <Button size="sm" variant="outline" onClick={handleAddRow} disabled={!!newRow}>
              <Plus className="size-4" />
              {t("ai.secret.manage.dialog.add")}
            </Button>
          </PermissionGuard>
        </div>
      </ScrollArea>
    </>
  );
};

/**
 * Dialog trigger component for managing secrets of a template
 */
const SecretsManageDialog = ({ template, onSecretChanged }: SecretsManageDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <PermissionGuard permissions="secret:list-by-template">
        <DialogTrigger asChild>
          <Button variant="ghost" size="xs" className="text-muted-foreground px-0 hover:px-2">
            <Settings />
            {t("ai.secret.manage.actions.manageSecrets", { count: template.Secrets?.length || 0 })}
            <ChevronRight />
          </Button>
        </DialogTrigger>
      </PermissionGuard>
      <DialogContent className="sm:max-w-5xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        {isOpen && <SecretsManageContent template={template} onSecretChanged={onSecretChanged} />}
      </DialogContent>
    </Dialog>
  );
};

const AiSecretTemplateManage = () => {
  const { t } = useI18n();
  const { confirm } = useAlertDialog();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedSearchKeyword] = useDebounceValue(searchKeyword.trim(), 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SecretTemplate | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importJson, setImportJson] = useState("");

  const { data: templates, refetch, isLoading } = useAllSecretTemplatesQuery();

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.filter((template) => {
      const matchKeyword =
        !debouncedSearchKeyword ||
        template.name.toLowerCase().includes(debouncedSearchKeyword.toLowerCase());
      const matchStatus =
        statusFilter === "all" ||
        template.isEnabled === (statusFilter === "enabled" ? BooleanNumber.YES : BooleanNumber.NO);
      return matchKeyword && matchStatus;
    });
  }, [templates, debouncedSearchKeyword, statusFilter]);

  const setEnabledMutation = useSetSecretTemplateEnabledMutation({
    onSuccess: (_, variables) => {
      toast.success(
        variables.isEnabled === BooleanNumber.YES
          ? t("ai.secret.manage.templateToast.enabled")
          : t("ai.secret.manage.templateToast.disabled"),
      );
      refetch();
    },
  });

  const deleteMutation = useDeleteSecretTemplateMutation({
    onSuccess: () => {
      toast.success(t("ai.secret.manage.templateToast.deleted"));
      refetch();
    },
    onError: (error) => {
      toast.error(t("ai.secret.manage.toast.deleteFailed", { error: error.message }));
    },
  });

  const importMutation = useImportSecretTemplateJsonMutation({
    onSuccess: () => {
      toast.success(t("ai.secret.manage.templateToast.importSuccess"));
      setImportDialogOpen(false);
      setImportJson("");
      refetch();
    },
    onError: (error) => {
      toast.error(t("ai.secret.manage.templateToast.importFailed", { error: error.message }));
    },
  });

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (template: SecretTemplate) => {
    setEditingTemplate(template);
    setFormDialogOpen(true);
  };

  const handleImport = () => {
    if (!importJson.trim()) {
      toast.error(t("ai.secret.manage.form.fillRequired"));
      return;
    }
    importMutation.mutate({ json: importJson });
  };

  const handleToggleEnabled = async (template: SecretTemplate) => {
    const newStatus =
      template.isEnabled === BooleanNumber.YES ? BooleanNumber.NO : BooleanNumber.YES;
    await confirm({
      title: t("ai.secret.manage.templateConfirm.statusTitle"),
      description: t("ai.secret.manage.templateConfirm.statusDesc", {
        action:
          newStatus === BooleanNumber.YES
            ? t("ai.secret.manage.confirm.enable")
            : t("ai.secret.manage.confirm.disable"),
      }),
    });
    setEnabledMutation.mutate({ id: template.id, isEnabled: newStatus });
  };

  const handleDelete = async (template: SecretTemplate) => {
    await confirm({
      title: t("ai.secret.manage.templateConfirm.deleteTitle"),
      description: t("ai.secret.manage.templateConfirm.deleteDesc"),
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
    <>
      <div className="flex flex-col gap-4">
        <div className="bg-background sticky top-0 z-2 grid grid-cols-1 gap-4 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 in-[.secret-index-page]:2xl:grid-cols-5">
          <Input
            placeholder={t("ai.secret.manage.searchPlaceholder")}
            className="text-sm"
            value={searchKeyword}
            onChange={handleSearchChange}
          />
          <Select onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("ai.secret.manage.statusOptions.all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("ai.secret.manage.statusOptions.all")}</SelectItem>
              <SelectItem value="enabled">{t("ai.secret.manage.statusOptions.enabled")}</SelectItem>
              <SelectItem value="disabled">
                {t("ai.secret.manage.statusOptions.disabled")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 in-[.secret-index-page]:2xl:grid-cols-5">
          <PermissionGuard permissions="secret-templates:create">
            <div className="bg-card flex flex-col gap-4 rounded-lg border border-dashed p-4 hover:border-solid">
              <div className="flex cursor-pointer items-center gap-3" onClick={handleCreate}>
                <Button className="size-12 rounded-lg border-dashed" variant="outline">
                  <Plus />
                </Button>
                <div className="flex flex-col">
                  <span>{t("ai.secret.manage.actions.addTemplate")}</span>
                  <span className="text-muted-foreground py-1 text-xs font-medium">
                    {t("ai.secret.manage.actions.addTemplateDesc")}
                  </span>
                </div>
              </div>

              <div className="mt-auto flex gap-4">
                <PermissionGuard permissions="secret-templates:import-json" blockOnly>
                  <Button
                    size="xs"
                    className="flex-1"
                    variant="outline"
                    onClick={() => setImportDialogOpen(true)}
                  >
                    <FileJson2 /> {t("ai.secret.manage.actions.importConfig")}
                  </Button>
                </PermissionGuard>
                <PermissionGuard permissions="secret-templates:create">
                  <Button size="xs" className="flex-1" variant="outline" onClick={handleCreate}>
                    <Plus /> {t("ai.secret.manage.actions.manualCreate")}
                  </Button>
                </PermissionGuard>
              </div>
            </div>
          </PermissionGuard>

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
                      <PermissionGuard permissions="secret-templates:toggle-enabled">
                        <Switch
                          checked={template.isEnabled === BooleanNumber.YES}
                          onCheckedChange={() => handleToggleEnabled(template)}
                          disabled={setEnabledMutation.isPending}
                        />
                      </PermissionGuard>
                    </div>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <span className="line-clamp-1">{template.name}</span>
                    <SecretsManageDialog template={template} onSecretChanged={refetch} />
                  </div>
                  <PermissionGuard
                    permissions={["secret-templates:update", "secret-templates:delete"]}
                    any
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="absolute top-2 right-2" size="icon-sm" variant="ghost">
                          <EllipsisVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <PermissionGuard permissions="secret-templates:update">
                          <DropdownMenuItem onClick={() => handleEdit(template)}>
                            <Edit />
                            {t("ai.secret.manage.actions.edit")}
                          </DropdownMenuItem>
                        </PermissionGuard>
                        <DropdownMenuSeparator />
                        <PermissionGuard permissions="secret-templates:delete">
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(template)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 />
                            {t("ai.secret.manage.actions.delete")}
                          </DropdownMenuItem>
                        </PermissionGuard>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </PermissionGuard>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge
                    active={template.isEnabled === BooleanNumber.YES}
                    activeText={t("ai.secret.manage.statusBadge.enabled")}
                    inactiveText={t("ai.secret.manage.statusBadge.disabled")}
                  />
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
                {searchKeyword
                  ? t("ai.secret.manage.empty.noResults", { keyword: searchKeyword })
                  : t("ai.secret.manage.empty.noData")}
              </span>
            </div>
          )}
        </div>
      </div>

      <SecretTemplateFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        template={editingTemplate}
        onSuccess={refetch}
      />

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("ai.secret.manage.importDialog.title")}</DialogTitle>
            <DialogDescription>{t("ai.secret.manage.importDialog.description")}</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t("ai.secret.manage.importDialog.placeholder")}
            className="min-h-[200px] font-mono text-sm"
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              {t("ai.secret.manage.importDialog.cancel")}
            </Button>
            <PermissionGuard permissions="secret-templates:import-json">
              <Button onClick={handleImport} disabled={importMutation.isPending}>
                {importMutation.isPending && <Loader2 className="animate-spin" />}
                {t("ai.secret.manage.importDialog.import")}
              </Button>
            </PermissionGuard>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AiSecretTemplateManage;
