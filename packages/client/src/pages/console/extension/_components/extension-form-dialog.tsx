import {
  ExtensionSupportTerminal,
  type ExtensionSupportTerminalType,
  ExtensionType,
  type ExtensionTypeType,
} from "@buildingai/constants/shared/extension.constant";
import {
  type CreateExtensionDto,
  type Extension,
  type UpdateExtensionDto,
  useCreateExtensionMutation,
  useUpdateExtensionMutation,
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
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import semver from "semver";
import { toast } from "sonner";
import { z } from "zod";

import { useI18n } from "@buildingai/i18n";

const formSchema = z.object({
  name: z
    .string({ message: "App name is required" })
    .min(1, "App name is required")
    .max(100, "App name cannot exceed 100 characters"),
  identifier: z
    .string({ message: "Identifier is required" })
    .min(1, "Identifier is required")
    .max(100, "Identifier cannot exceed 100 characters"),
  description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
  type: z.number({ message: "Please select app type" }),
  supportTerminal: z.array(z.number()).min(1, "Please select at least one").optional(),
  version: z
    .string()
    .min(1, "Version is required")
    .max(50, "Version cannot exceed 50 characters")
    .refine(
      (val) => {
        if (!val) return true;
        return semver.valid(val) !== null;
      },
      { message: "Version format is incorrect" },
    )
    .optional(),
  authorName: z.string().max(100, "Author name cannot exceed 100 characters").optional(),
  icon: z.string().max(500, "Icon URL cannot exceed 500 characters").optional(),
});

type FormValues = z.infer<typeof formSchema>;

type ExtensionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extension?: Extension | null;
  onSuccess?: () => void;
};

export const ExtensionFormDialog = ({
  open,
  onOpenChange,
  extension,
  onSuccess,
}: ExtensionFormDialogProps) => {
  const { t } = useI18n();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      name: "",
      identifier: "",
      description: "",
      type: ExtensionType.APPLICATION,
      supportTerminal: [],
      version: "1.0.0",
      authorName: "",
      icon: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (extension) {
        form.reset({
          name: extension.name || "",
          identifier: extension.identifier || "",
          description: extension.description || "",
          type: extension.type ?? ExtensionType.APPLICATION,
          supportTerminal: extension.supportTerminal ?? [],
          version: extension.version || "",
          authorName: extension.author?.name || "",
          icon: extension.icon || "",
        });
      } else {
        form.reset({
          name: "",
          identifier: "",
          description: "",
          type: ExtensionType.APPLICATION,
          supportTerminal: [],
          version: "",
          authorName: "",
          icon: "",
        });
      }
    }
  }, [open, extension, form]);

  const isEditMode = !!extension;

  const createMutation = useCreateExtensionMutation({
    onSuccess: () => {
      toast.success(t("extension.form.createSuccess"));
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(t("extension.form.createFailed", { error: error.message }));
    },
  });

  const updateMutation = useUpdateExtensionMutation({
    onSuccess: () => {
      toast.success(t("extension.form.updateSuccess"));
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(t("extension.form.updateFailed", { error: error.message }));
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (values: FormValues) => {
    if (isEditMode) {
      const dto: UpdateExtensionDto = {
        name: values.name,
        description: values.description || undefined,
        type: values.type as ExtensionTypeType,
        supportTerminal: values.supportTerminal as ExtensionSupportTerminalType[] | undefined,
        version: values.version || undefined,
        author: values.authorName ? { ...extension.author, name: values.authorName } : undefined,
        icon: values.icon || undefined,
      };
      updateMutation.mutate({ id: extension.id, dto });
    } else {
      const dto: CreateExtensionDto = {
        name: values.name,
        identifier: values.identifier,
        description: values.description || undefined,
        type: values.type as ExtensionTypeType,
        supportTerminal: values.supportTerminal as ExtensionSupportTerminalType[] | undefined,
        version: values.version || undefined,
        author: values.authorName ? { name: values.authorName } : undefined,
        icon: values.icon || undefined,
      };
      createMutation.mutate(dto);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4">
          <DialogTitle>
            {isEditMode ? t("extension.form.editTitle") : t("extension.form.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("extension.form.editDescription")
              : t("extension.form.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4 pt-0 pb-17">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("extension.form.appIcon")}</FormLabel>
                    <FormControl>
                      <ImageUpload
                        size="lg"
                        shape="rounded"
                        value={field.value || undefined}
                        onChange={(url) => field.onChange(url ?? "")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("extension.form.appName")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("extension.form.appNamePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("extension.form.identifier")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("extension.form.identifierPlaceholder")}
                        disabled={!!extension}
                        {...field}
                      />
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
                    <FormLabel>{t("extension.form.description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("extension.form.descriptionPlaceholder")}
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("extension.form.appType")}</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(Number(v))}
                      value={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("extension.form.selectAppType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={String(ExtensionType.APPLICATION)}>
                          {t("extension.type.application")}
                        </SelectItem>
                        <SelectItem value={String(ExtensionType.FUNCTIONAL)}>
                          {t("extension.type.functional")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supportTerminal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("extension.form.supportedTerminals")}</FormLabel>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-1.5 text-sm">
                        <Checkbox
                          checked={field.value?.includes(ExtensionSupportTerminal.WEB) ?? false}
                          disabled={false}
                          onCheckedChange={(v) => {
                            const next = v
                              ? [...(field.value ?? []), ExtensionSupportTerminal.WEB]
                              : (field.value ?? []).filter(
                                  (t) => t !== ExtensionSupportTerminal.WEB,
                                );
                            field.onChange(next);
                          }}
                        />
                        {t("extension.terminalLabels.web")}
                      </label>
                      <label className="flex items-center gap-1.5 text-sm">
                        <Checkbox
                          checked={field.value?.includes(ExtensionSupportTerminal.WEIXIN) ?? false}
                          disabled={true}
                          onCheckedChange={() => {}}
                        />
                        {t("extension.terminalLabels.weixin")}
                      </label>
                      <label className="flex items-center gap-1.5 text-sm">
                        <Checkbox
                          checked={field.value?.includes(ExtensionSupportTerminal.H5) ?? false}
                          disabled={true}
                          onCheckedChange={() => {}}
                        />
                        {t("extension.terminalLabels.h5")}
                      </label>
                      <label className="flex items-center gap-1.5 text-sm">
                        <Checkbox
                          checked={field.value?.includes(ExtensionSupportTerminal.MP) ?? false}
                          disabled={true}
                          onCheckedChange={() => {}}
                        />
                        {t("extension.terminalLabels.mp")}
                      </label>
                      <label className="flex items-center gap-1.5 text-sm">
                        <Checkbox
                          checked={field.value?.includes(ExtensionSupportTerminal.API) ?? false}
                          disabled={true}
                          onCheckedChange={() => {}}
                        />
                        {t("extension.terminalLabels.api")}
                      </label>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 items-start gap-4">
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>{t("extension.form.appVersion")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("extension.form.versionPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="authorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("extension.form.authorName")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("extension.form.authorNamePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="bg-background absolute bottom-0 left-0 w-full flex-row justify-end rounded-lg p-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t("extension.form.cancel")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="animate-spin" />}
                  {isEditMode ? t("extension.form.save") : t("extension.form.create")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
