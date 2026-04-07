import { MODEL_TYPE_DESCRIPTIONS, type ModelType } from "@buildingai/ai-sdk/interfaces";
import { useI18n } from "@buildingai/i18n";
import {
  type AiProvider,
  type CreateAiProviderDto,
  useAllSecretTemplatesQuery,
  useCreateAiProviderMutation,
  useUpdateAiProviderMutation,
} from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@buildingai/ui/components/ui/form";
import { ImageUpload } from "@buildingai/ui/components/ui/image-upload";
import { Input } from "@buildingai/ui/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@buildingai/ui/components/ui/radio-group";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { FolderKey, Loader2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const MODEL_TYPES = Object.keys(MODEL_TYPE_DESCRIPTIONS) as ModelType[];

const formSchema = z.object({
  provider: z
    .string({ message: "Provider identifier is required" })
    .min(1, "Provider identifier is required")
    .max(50, "Provider identifier cannot exceed 50 characters"),
  name: z
    .string({ message: "Provider name is required" })
    .min(1, "Provider name is required")
    .max(100, "Provider name cannot exceed 100 characters"),
  description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
  bindSecretId: z
    .string({ message: "Please select a secret key" })
    .min(1, "Please bind a secret key"),
  supportedModelTypes: z.array(z.string()).min(1, "Please select at least one type").optional(),
  iconUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().min(0, "Sort weight cannot be less than 0").optional(),
});

type FormValues = z.infer<typeof formSchema>;

type AiProviderFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openSecretManageDialog: () => void;
  provider?: AiProvider | null;
  onSuccess?: () => void;
};

/**
 * AI Provider form dialog component for creating and updating providers
 */
export const AiProviderFormDialog = ({
  open,
  onOpenChange,
  openSecretManageDialog,
  provider,
  onSuccess,
}: AiProviderFormDialogProps) => {
  const { t } = useI18n();
  const isEditMode = !!provider;

  const { data: secretTemplates } = useAllSecretTemplatesQuery();

  const secrets = useMemo(() => {
    if (!secretTemplates) return [];
    return secretTemplates.flatMap((template) =>
      (template.Secrets || []).map((secret) => ({
        id: secret.id,
        name: secret.name,
        templateName: template.name,
      })),
    );
  }, [secretTemplates]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      provider: "",
      name: "",
      description: "",
      bindSecretId: "",
      supportedModelTypes: [],
      iconUrl: "",
      isActive: false,
      sortOrder: 0,
    },
  });

  const bindSecretId = form.watch("bindSecretId");
  const canEnable = isEditMode || !!bindSecretId;

  useEffect(() => {
    if (!isEditMode && !bindSecretId) {
      form.setValue("isActive", false);
    }
  }, [isEditMode, bindSecretId, form]);

  useEffect(() => {
    if (open) {
      if (provider) {
        form.reset({
          provider: provider.provider,
          name: provider.name,
          description: provider.description || "",
          bindSecretId: provider.bindSecretId || "",
          supportedModelTypes: provider.supportedModelTypes || [],
          iconUrl: provider.iconUrl || "",
          isActive: provider.isActive,
          sortOrder: provider.sortOrder,
        });
      } else {
        form.reset({
          provider: "",
          name: "",
          description: "",
          bindSecretId: "",
          supportedModelTypes: [],
          iconUrl: "",
          isActive: false,
          sortOrder: 0,
        });
      }
    }
  }, [open, provider, form]);

  const createMutation = useCreateAiProviderMutation({
    onSuccess: () => {
      toast.success(t("ai.provider.toast.createSuccess"));
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(t("ai.provider.toast.createFailed", { error: error.message }));
    },
  });

  const updateMutation = useUpdateAiProviderMutation({
    onSuccess: () => {
      toast.success(t("ai.provider.toast.updateSuccess"));
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(t("ai.provider.toast.updateFailed", { error: error.message }));
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (values: FormValues) => {
    const dto: CreateAiProviderDto = {
      provider: values.provider,
      name: values.name,
      description: values.description || undefined,
      bindSecretId: values.bindSecretId,
      supportedModelTypes: (values.supportedModelTypes || []).map((t) =>
        t.toLowerCase(),
      ) as ModelType[],
      iconUrl: values.iconUrl || undefined,
      isActive: values.isActive,
      sortOrder: values.sortOrder,
    };

    if (isEditMode && provider) {
      updateMutation.mutate({ id: provider.id, dto });
    } else {
      createMutation.mutate(dto);
    }
  };

  const modelTypeAnchor = useComboboxAnchor();
  const [container, setContainer] = useState<HTMLElement | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={setContainer} className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4">
          <DialogTitle>
            {isEditMode ? t("ai.provider.dialog.editTitle") : t("ai.provider.dialog.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("ai.provider.dialog.editDescription")
              : t("ai.provider.dialog.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4 pt-0 pb-17">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="iconUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("ai.provider.form.icon")}</FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value}
                          onChange={(url) => field.onChange(url ?? "")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel required>{t("ai.provider.form.status")}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          className="flex gap-4"
                          value={field.value ? "true" : "false"}
                          onValueChange={(v) => field.onChange(v === "true")}
                        >
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="true" disabled={!canEnable} />
                            {t("common.action.enable")}
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="false" />
                            {t("common.action.disable")}
                          </label>
                        </RadioGroup>
                      </FormControl>
                      {!isEditMode && !bindSecretId && (
                        <FormDescription className="text-xs">
                          {t("ai.provider.form.statusHint")}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("ai.provider.form.provider")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("ai.provider.form.providerPlaceholder")}
                        {...field}
                        disabled={isEditMode}
                      />
                    </FormControl>
                    <FormDescription>{t("ai.provider.form.providerDescription")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("ai.provider.form.name")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("ai.provider.form.namePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("ai.provider.form.description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("ai.provider.form.descriptionPlaceholder")}
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bindSecretId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel required>{t("ai.provider.form.bindSecret")}</FormLabel>
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={openSecretManageDialog}
                        type="button"
                      >
                        <FolderKey />
                        {t("ai.provider.form.manageSecret")}
                      </Button>
                    </div>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t("ai.provider.form.selectSecretPlaceholder")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {secrets.map((secret) => (
                          <SelectItem key={secret.id} value={secret.id}>
                            {secret.name}
                            <span className="text-muted-foreground ml-2 text-xs">
                              ({secret.templateName})
                            </span>
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
                name="supportedModelTypes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("ai.provider.form.supportedModelTypes")}</FormLabel>
                    <FormControl>
                      <Combobox
                        multiple
                        autoHighlight
                        items={MODEL_TYPES}
                        value={field.value || []}
                        onValueChange={field.onChange}
                      >
                        <ComboboxChips ref={modelTypeAnchor} className="min-h-9 w-full">
                          <ComboboxValue>
                            {(values: string[]) => (
                              <React.Fragment>
                                {values.map((value: string) => (
                                  <ComboboxChip key={value}>
                                    {MODEL_TYPE_DESCRIPTIONS[value as ModelType]?.nameEn || value}
                                  </ComboboxChip>
                                ))}
                                <ComboboxChipsInput
                                  placeholder={t("ai.provider.form.selectModelTypePlaceholder")}
                                />
                              </React.Fragment>
                            )}
                          </ComboboxValue>
                        </ComboboxChips>
                        <ComboboxContent anchor={modelTypeAnchor} container={container}>
                          <ComboboxEmpty>{t("ai.provider.form.noMatch")}</ComboboxEmpty>
                          <ComboboxList>
                            {(item: string) => (
                              <ComboboxItem key={item} value={item}>
                                {MODEL_TYPE_DESCRIPTIONS[item as ModelType]?.nameEn || item}
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
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("ai.provider.form.sortOrder")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="bg-background absolute bottom-0 left-0 w-full flex-row justify-end rounded-lg p-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t("common.action.cancel")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="animate-spin" />}
                  {isEditMode ? t("common.action.save") : t("common.action.create")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
