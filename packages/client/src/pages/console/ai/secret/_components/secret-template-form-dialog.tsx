import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import { useI18n } from "@buildingai/i18n";
import {
  type CreateSecretTemplateDto,
  type SecretTemplate,
  type SecretTemplateFieldConfig,
  useCreateSecretTemplateMutation,
  useUpdateSecretTemplateMutation,
} from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
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
import { ImageUpload } from "@buildingai/ui/components/ui/image-upload";
import { Input } from "@buildingai/ui/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@buildingai/ui/components/ui/radio-group";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleMinus, Info, Loader2, Plus } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const fieldConfigSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
});

const formSchema = z.object({
  name: z
    .string({ message: "Template name is required" })
    .min(1, "Template name is required")
    .max(100, "Template name cannot exceed 100 characters"),
  icon: z.string().optional(),
  fieldConfig: z.array(fieldConfigSchema).min(1, "At least one field configuration is required"),
  isEnabled: z.boolean().optional(),
  sortOrder: z.number().min(0, "Sort order cannot be less than 0").optional(),
});

type FormValues = z.infer<typeof formSchema>;

type SecretTemplateFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: SecretTemplate | null;
  onSuccess?: () => void;
};

export const SecretTemplateFormDialog = ({
  open,
  onOpenChange,
  template,
  onSuccess,
}: SecretTemplateFormDialogProps) => {
  const { t } = useI18n();
  const isEditMode = !!template;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      name: "",
      icon: "",
      fieldConfig: [
        {
          name: "baseUrl",
          required: false,
          placeholder: t("ai.secret.template.form.placeholderPlaceholder"),
        },
      ],
      isEnabled: true,
      sortOrder: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fieldConfig",
  });

  useEffect(() => {
    if (open) {
      if (template) {
        form.reset({
          name: template.name,
          icon: template.icon || "",
          fieldConfig:
            template.fieldConfig?.length > 0
              ? template.fieldConfig.map((f) => ({
                  name: f.name,
                  required: f.required ?? false,
                  placeholder: f.placeholder || "",
                }))
              : [
                  {
                    name: "baseUrl",
                    required: false,
                    placeholder: t("ai.secret.template.form.placeholderPlaceholder"),
                  },
                ],
          isEnabled: template.isEnabled === BooleanNumber.YES,
          sortOrder: template.sortOrder,
        });
      } else {
        form.reset({
          name: "",
          icon: "",
          fieldConfig: [
            {
              name: "baseUrl",
              required: false,
              placeholder: t("ai.secret.template.form.placeholderPlaceholder"),
            },
          ],
          isEnabled: true,
          sortOrder: 0,
        });
      }
    }
  }, [open, template, form]);

  const createMutation = useCreateSecretTemplateMutation({
    onSuccess: () => {
      toast.success(t("ai.secret.template.toast.createSuccess"));
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const updateMutation = useUpdateSecretTemplateMutation({
    onSuccess: () => {
      toast.success(t("ai.secret.template.toast.updateSuccess"));
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (values: FormValues) => {
    const fieldConfig: SecretTemplateFieldConfig[] = values.fieldConfig.map((f) => ({
      name: f.name,
      required: f.required,
      placeholder: f.placeholder || undefined,
    }));

    if (isEditMode && template) {
      updateMutation.mutate({
        id: template.id,
        data: {
          name: values.name,
          icon: values.icon || undefined,
          fieldConfig,
          isEnabled: values.isEnabled ? BooleanNumber.YES : BooleanNumber.NO,
          sortOrder: values.sortOrder,
        },
      });
    } else {
      const dto: CreateSecretTemplateDto = {
        name: values.name,
        icon: values.icon || undefined,
        fieldConfig,
        isEnabled: values.isEnabled ? BooleanNumber.YES : BooleanNumber.NO,
        sortOrder: values.sortOrder,
      };
      createMutation.mutate(dto);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="p-4">
          <DialogTitle>
            {isEditMode
              ? t("ai.secret.template.dialog.editTitle")
              : t("ai.secret.template.dialog.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("ai.secret.template.dialog.editDescription")
              : t("ai.secret.template.dialog.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4 pt-0 pb-17">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("ai.secret.template.form.icon")}</FormLabel>
                      <FormControl>
                        <ImageUpload
                          size="sm"
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
                  name="isEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel required>{t("ai.secret.template.form.status")}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          className="flex gap-4"
                          value={field.value ? "true" : "false"}
                          onValueChange={(v) => field.onChange(v === "true")}
                        >
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="true" />
                            {t("common.action.enable")}
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="false" />
                            {t("common.action.disable")}
                          </label>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("ai.secret.template.form.name")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("ai.secret.template.form.namePlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel required>{t("ai.secret.template.form.fieldConfig")}</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => append({ name: "", required: false, placeholder: "" })}
                  >
                    <Plus className="size-3.5" />
                    {t("ai.secret.template.form.addField")}
                  </Button>
                </div>

                {fields.length === 0 && (
                  <p className="text-muted-foreground text-center text-sm">
                    {t("ai.secret.template.form.emptyFieldConfig")}
                  </p>
                )}

                {fields.map((field, index) => (
                  <div key={field.id} className="bg-muted/30 rounded-lg border p-3">
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="destructive"
                            className="text-destructive size-fit shrink-0 p-0"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 1}
                          >
                            <CircleMinus className="size-3.5" />
                          </Button>
                          <span className="text-sm font-bold">
                            {t("ai.secret.template.form.fieldIndex", { index: index + 1 })}
                          </span>
                        </div>
                        <FormField
                          control={form.control}
                          name={`fieldConfig.${index}.required`}
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  id={`checkbox-${index}`}
                                  name={`fieldConfig.${index}.required`}
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="text-muted-foreground text-xs font-normal">
                                {t("ai.secret.template.form.required")}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name={`fieldConfig.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("ai.secret.template.form.fieldName")}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={t("ai.secret.template.form.fieldNamePlaceholder")}
                                  className="h-8 text-sm"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`fieldConfig.${index}.placeholder`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("ai.secret.template.form.placeholder")}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={t("ai.secret.template.form.placeholderPlaceholder")}
                                  className="h-8 text-sm"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <p className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
                  <Info className="size-3" />
                  <span>{t("ai.secret.template.form.baseUrlHint")}</span>
                </p>

                {form.formState.errors.fieldConfig?.root && (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.fieldConfig.root.message}
                  </p>
                )}
              </div>

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("ai.secret.template.form.sortOrder")}</FormLabel>
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
