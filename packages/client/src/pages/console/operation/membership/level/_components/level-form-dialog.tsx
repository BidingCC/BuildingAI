import { useI18n } from "@buildingai/i18n";
import {
  type CreateLevelsDto,
  type MembershipLevelListItem,
  useCreateMembershipLevelMutation,
  useUpdateMembershipLevelMutation,
} from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@buildingai/ui/components/ui/input-group";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import type { Resolver } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const benefitSchema = z.object({
  icon: z.string().optional(),
  content: z.string().optional(),
});

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Level name is required")
    .max(64, "Level name cannot exceed 64 characters"),
  level: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .pipe(z.number().int().min(1, "Level must be 1 or greater")),
  icon: z.string().optional(),
  givePower: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .pipe(z.number().int().min(0, "Monthly gifted credits cannot be negative"))
    .optional(),
  storageCapacity: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .pipe(z.number().int().min(0, "Gifted knowledge base space cannot be negative"))
    .optional(),
  description: z.string().max(255).optional(),
  benefits: z.array(benefitSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

type LevelFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level?: MembershipLevelListItem | null;
  onSuccess?: () => void;
};

const defaultBenefit = { icon: "", content: "" };

export const LevelFormDialog = ({ open, onOpenChange, level, onSuccess }: LevelFormDialogProps) => {
  const { t } = useI18n();
  const isEditMode = !!level;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      name: "",
      level: 1,
      icon: "",
      givePower: 0,
      storageCapacity: 0,
      description: "",
      benefits: [defaultBenefit],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "benefits",
  });

  useEffect(() => {
    if (open) {
      if (level) {
        form.reset({
          name: level.name,
          level: level.level,
          icon: level.icon ?? "",
          givePower: level.givePower ?? 0,
          storageCapacity: level.storageCapacity ?? 0,
          description: level.description ?? "",
          benefits:
            level.benefits && level.benefits.length > 0
              ? level.benefits.map((b) => ({ icon: b.icon ?? "", content: b.content ?? "" }))
              : [defaultBenefit],
        });
      } else {
        form.reset({
          name: "",
          level: 1,
          icon: "",
          givePower: 0,
          description: "",
          benefits: [defaultBenefit],
        });
      }
    }
  }, [open, level, form]);

  const createMutation = useCreateMembershipLevelMutation({
    onSuccess: () => {
      toast.success(t("operation.membership.level.levelCreated"));
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const updateMutation = useUpdateMembershipLevelMutation({
    onSuccess: () => {
      toast.success(t("operation.membership.level.levelUpdated"));
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (values: FormValues) => {
    const body: CreateLevelsDto = {
      name: values.name,
      level: values.level,
      icon: values.icon || undefined,
      givePower: values.givePower ?? 0,
      storageCapacity: values.storageCapacity ?? 0,
      description: values.description || undefined,
      benefits: values.benefits?.filter((b) => b.content?.trim())?.length
        ? values.benefits
            ?.filter((b) => b.content?.trim())
            .map((b) => ({ icon: b.icon ?? "", content: b.content!.trim() }))
        : undefined,
    };
    if (isEditMode && level) {
      updateMutation.mutate({ id: level.id, body });
    } else {
      createMutation.mutate(body);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4">
          <DialogTitle>
            {isEditMode
              ? t("operation.membership.level.edit")
              : t("operation.membership.level.add")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("operation.membership.level.form.editDescription")
              : t("operation.membership.level.form.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4 pt-0 pb-17">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("operation.membership.level.form.name")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("operation.membership.level.form.namePlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("operation.membership.level.form.level")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder={t("operation.membership.level.form.levelPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("operation.membership.level.form.levelDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("operation.membership.level.form.iconLabel")}</FormLabel>
                    <FormControl>
                      <ImageUpload
                        size="lg"
                        value={field.value || undefined}
                        onChange={(url) => field.onChange(url ?? "")}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("operation.membership.level.form.iconDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="givePower"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("operation.membership.level.form.givePowerLabel")}</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storageCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("operation.membership.level.form.storageCapacityLabel")}
                    </FormLabel>
                    <FormControl>
                      <InputGroup>
                        <InputGroupInput
                          id="inline-end-input"
                          type="number"
                          min={0}
                          placeholder="0"
                          {...field}
                        />
                        <InputGroupAddon align="inline-end">MB</InputGroupAddon>
                      </InputGroup>
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
                    <FormLabel>{t("operation.membership.level.form.descriptionLabel")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("operation.membership.level.form.descriptionPlaceholder")}
                        className="min-h-[80px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <div className="bg-background sticky top-0 z-10 flex items-center justify-between">
                  <FormLabel>{t("operation.membership.level.form.benefitsLabel")}</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => append(defaultBenefit)}
                  >
                    <Plus className="mr-1 size-4" />
                    {t("operation.membership.level.form.addBenefit")}
                  </Button>
                </div>
                <p className="text-muted-foreground text-sm">
                  {t("operation.membership.level.form.benefitsDescription")}
                </p>
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border p-3"
                    >
                      <FormField
                        control={form.control}
                        name={`benefits.${index}.icon`}
                        render={({ field: iconField }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              {t("operation.membership.level.form.benefitIcon")}
                            </FormLabel>
                            <FormControl>
                              <ImageUpload
                                className="h-10 w-10"
                                size="sm"
                                value={iconField.value || undefined}
                                onChange={(url) => iconField.onChange(url ?? "")}
                                forceMobile
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`benefits.${index}.content`}
                        render={({ field: contentField }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs">
                              {t("operation.membership.level.form.benefitContent")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t(
                                  "operation.membership.level.form.benefitContentPlaceholder",
                                )}
                                className="h-10"
                                {...contentField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive mt-6 size-8 shrink-0"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

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
