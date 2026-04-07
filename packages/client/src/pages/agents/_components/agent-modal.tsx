import { useI18n } from "@buildingai/i18n";
import { createAgent, updateAgentConfig, useWebAgentConfigQuery } from "@buildingai/services/web";
import SvgIcons from "@buildingai/ui/components/svg-icons";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@buildingai/ui/components/ui/input-group";
import { Label } from "@buildingai/ui/components/ui/label";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { UploadDropzone, UploadRoot, UploadTrigger } from "@buildingai/ui/components/upload";
import { cn } from "@buildingai/ui/lib/utils";
import { ChevronsLeftRight, Loader2, Pencil, UploadIcon, X } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

export type CreationMethod = "direct" | "coze" | "dify";

export interface AgentEditFormValues {
  name: string;
  description: string;
  avatarUrl?: string;
  creationMethod: CreationMethod;
}

export interface AgentModalProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId?: string;
  initialValues?: Partial<AgentEditFormValues>;
  onSuccess?: (agent: unknown) => void;
}

const defaultForm: AgentEditFormValues = {
  name: "",
  description: "",
  avatarUrl: undefined,
  creationMethod: "direct",
};

const creationMethods: {
  value: CreationMethod;
  labelKey: string;
  descriptionKey: string;
  icon: ReactNode;
}[] = [
  {
    value: "direct",
    labelKey: "agent.modal.directCreate",
    descriptionKey: "agent.modal.directCreateDesc",
    icon: <ChevronsLeftRight className="size-4" />,
  },
  {
    value: "coze",
    labelKey: "agent.modal.cozeAgent",
    descriptionKey: "agent.modal.importFromThirdParty",
    icon: <SvgIcons.coze className="size-3" />,
  },
  {
    value: "dify",
    labelKey: "agent.modal.difyAgent",
    descriptionKey: "agent.modal.importFromThirdParty",
    icon: <SvgIcons.dify className="size-4" />,
  },
];

const creationMethodConfigKeyMap: Record<CreationMethod, "direct" | "coze" | "dify"> = {
  direct: "direct",
  coze: "coze",
  dify: "dify",
};

export function AgentModal({
  mode,
  open,
  onOpenChange,
  agentId,
  initialValues,
  onSuccess,
}: AgentModalProps) {
  const { t } = useI18n();
  const [form, setForm] = useState<AgentEditFormValues>(defaultForm);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: agentConfig } = useWebAgentConfigQuery({
    enabled: open && mode === "create",
  });

  const enabledCreationMethods = useMemo(() => {
    const configMap = new Map(
      (agentConfig?.createTypes ?? []).map((item) => [item.key, item.enabled]),
    );
    if (configMap.size === 0) {
      return creationMethods;
    }

    return creationMethods.filter((method) =>
      configMap.get(creationMethodConfigKeyMap[method.value]),
    );
  }, [agentConfig?.createTypes]);

  const displayCreationMethods = mode === "edit" ? creationMethods : enabledCreationMethods;
  const hasAvailableCreationMethods = displayCreationMethods.length > 0;

  useEffect(() => {
    if (open) {
      const fallbackCreationMethod = displayCreationMethods[0]?.value ?? "direct";
      setForm({
        name: initialValues?.name ?? "",
        description: initialValues?.description ?? "",
        avatarUrl: initialValues?.avatarUrl,
        creationMethod: initialValues?.creationMethod ?? fallbackCreationMethod,
      });
      setAvatarUrl(initialValues?.avatarUrl);
    }
  }, [
    displayCreationMethods,
    open,
    initialValues?.name,
    initialValues?.description,
    initialValues?.avatarUrl,
    initialValues?.creationMethod,
  ]);

  useEffect(() => {
    if (!open || mode === "edit" || !hasAvailableCreationMethods) return;
    if (displayCreationMethods.some((method) => method.value === form.creationMethod)) return;

    setForm((prev) => ({
      ...prev,
      creationMethod: displayCreationMethods[0]!.value,
    }));
  }, [displayCreationMethods, form.creationMethod, hasAvailableCreationMethods, mode, open]);

  const handleSubmit = async () => {
    const trimmedName = form.name.trim();
    const trimmedDescription = form.description.trim();

    if (!trimmedName) return;

    setIsSubmitting(true);
    try {
      if (mode === "create") {
        const agent = await createAgent({
          name: trimmedName,
          description: trimmedDescription || undefined,
          avatar: avatarUrl,
          createMode: form.creationMethod,
        });
        onOpenChange(false);
        onSuccess?.(agent);
        return;
      } else {
        if (!agentId) throw new Error("agentId is required");
        const agent = await updateAgentConfig(agentId, {
          name: trimmedName || undefined,
          description: form.description?.trim() || undefined,
          avatar: avatarUrl,
        });
        onOpenChange(false);
        onSuccess?.(agent);
        return;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitLabel = mode === "create" ? t("agent.modal.creating") : t("agent.modal.saving");
  const isFormValid =
    form.name.trim().length > 0 && (mode === "edit" || hasAvailableCreationMethods);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>
            {mode === "create" ? t("agent.modal.createAgent") : t("agent.modal.editAgent")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-4 pt-6 pb-4">
          <FormField label={t("agent.modal.creationMethod")} required>
            {!hasAvailableCreationMethods ? (
              <div className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-sm">
                {t("agent.modal.noAvailableTypes")}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {displayCreationMethods.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    disabled={mode === "edit"}
                    onClick={() => setForm((p) => ({ ...p, creationMethod: method.value }))}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                      mode === "edit" && "cursor-not-allowed opacity-60",
                      form.creationMethod === method.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-muted-foreground",
                          method.value === "coze" && "rounded-sm bg-[#4e53e8] p-1 text-white",
                        )}
                      >
                        {method.icon}
                      </span>
                      <span className="text-sm font-medium">{t(method.labelKey)}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {t(method.descriptionKey)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </FormField>

          <FormField label={t("agent.modal.avatarAndName")} required>
            <div className="flex items-center gap-3">
              <AvatarUpload
                avatarUrl={avatarUrl}
                isUploading={isAvatarUploading}
                onUploadStart={() => setIsAvatarUploading(true)}
                onUploadSuccess={(url) => {
                  setAvatarUrl(url);
                  setIsAvatarUploading(false);
                }}
                onUploadError={() => setIsAvatarUploading(false)}
                onClear={() => setAvatarUrl(undefined)}
              />
              <InputGroup className="min-w-0 flex-1">
                <InputGroupInput
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t("agent.modal.namePlaceholder")}
                />
                {form.name.length > 0 && (
                  <InputGroupAddon align="inline-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setForm((p) => ({ ...p, name: "" }))}
                    >
                      <X className="size-4" />
                    </Button>
                  </InputGroupAddon>
                )}
              </InputGroup>
            </div>
          </FormField>

          <FormField label={t("agent.modal.agentDescription")}>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder={t("agent.modal.descriptionPlaceholder")}
              className="min-h-34 resize-none"
            />
          </FormField>
        </div>

        <DialogFooter className="px-4 py-4">
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              {t("common.cancel")}
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isSubmitting || !isFormValid}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {submitLabel}
              </>
            ) : (
              t("agent.modal.confirmCreate")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

function AvatarUpload({
  avatarUrl,
  isUploading,
  onUploadStart,
  onUploadSuccess,
  onUploadError,
  onClear,
}: {
  avatarUrl?: string;
  isUploading: boolean;
  onUploadStart: () => void;
  onUploadSuccess: (url: string) => void;
  onUploadError: () => void;
  onClear: () => void;
}) {
  const hasAvatar = Boolean(avatarUrl);

  return (
    <UploadRoot
      accept="image/*"
      maxFiles={1}
      onUploadStart={onUploadStart}
      onUploadSuccess={(_, result) => onUploadSuccess(result.url)}
      onUploadError={onUploadError}
      onUploadComplete={onUploadError}
      onFilesChange={(files) => {
        if (files.length === 0) onClear();
      }}
    >
      <div className="bg-muted/30 relative size-9 shrink-0 overflow-hidden rounded-md border">
        <UploadDropzone
          className={cn(
            "bg-muted/30 hover:bg-muted/50 absolute inset-0 cursor-pointer border-0 border-dashed",
            hasAvatar && "pointer-events-none z-0 opacity-0",
          )}
        >
          {!hasAvatar && (
            <div className="flex size-full items-center justify-center">
              {isUploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UploadIcon className="text-muted-foreground size-4" />
              )}
            </div>
          )}
        </UploadDropzone>

        {hasAvatar && (
          <>
            <img src={avatarUrl} alt="" className="size-full object-cover" />
            {isUploading && (
              <div className="bg-background/60 absolute inset-0 flex items-center justify-center">
                <Loader2 className="size-4 animate-spin" />
              </div>
            )}
            <UploadTrigger asChild>
              <button
                type="button"
                className="bg-muted/90 text-muted-foreground hover:bg-muted hover:text-foreground absolute right-0 bottom-0 z-10 flex size-4 items-center justify-center rounded-tl-sm"
              >
                <Pencil className="size-2.5" />
              </button>
            </UploadTrigger>
          </>
        )}
      </div>
    </UploadRoot>
  );
}
