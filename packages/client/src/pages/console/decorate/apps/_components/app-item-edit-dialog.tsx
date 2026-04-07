"use client";

import { useI18n } from "@buildingai/i18n";
import type { ConsoleTag } from "@buildingai/services/console";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
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
  useComboboxAnchor,
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
import { Switch } from "@buildingai/ui/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export type AppItemEditValues = {
  id: string;
  appName: string;
  displayName: string;
  description: string;
  icon: string;
  visible: boolean;
  tagIds: string[];
};

export type AppItemEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AppItemEditValues | null;
  tags: ConsoleTag[];
  onSave: (values: AppItemEditValues) => void;
  isPending?: boolean;
};

const formSchema = z.object({
  appName: z.string(),
  displayName: z.string().min(1, "Display name is required"),
  description: z.string(),
  icon: z.string(),
  visible: z.boolean(),
  tagIds: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

export function AppItemEditDialog({
  open,
  onOpenChange,
  item,
  tags,
  onSave,
  isPending,
}: AppItemEditDialogProps) {
  const { t } = useI18n();
  const anchor = useComboboxAnchor();
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      appName: "",
      displayName: "",
      description: "",
      icon: "",
      visible: true,
      tagIds: [],
    },
  });

  useEffect(() => {
    if (!open || !item) return;
    form.reset({
      appName: item.appName,
      displayName: item.displayName,
      description: item.description,
      icon: item.icon,
      visible: item.visible,
      tagIds: item.tagIds ?? [],
    });
  }, [open, item, form]);

  const handleSubmit = (values: FormValues) => {
    if (!item) return;
    onSave({
      ...item,
      ...values,
    });
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-md flex-col">
        <DialogHeader>
          <DialogTitle>{t("decorate.apps.item.editApp")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form ref={setContainer} className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="appName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("decorate.apps.item.appName")}</FormLabel>
                  <FormControl>
                    <Input id="app-name" className="bg-muted" disabled {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="display-name">
                    {t("decorate.apps.item.displayName")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="display-name"
                      placeholder={t("decorate.apps.item.displayNamePlaceholder")}
                      disabled={isPending}
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
                  <FormLabel htmlFor="description">{t("decorate.apps.item.description")}</FormLabel>
                  <FormControl>
                    <Input
                      id="description"
                      placeholder={t("decorate.apps.item.descriptionPlaceholder")}
                      disabled={isPending}
                      {...field}
                    />
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
                  <FormLabel>{t("decorate.apps.item.icon")}</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-12">
                        <AvatarImage src={field.value || undefined} alt="" />
                        <AvatarFallback>
                          {form.watch("displayName").slice(0, 2).toUpperCase() || "APP"}
                        </AvatarFallback>
                      </Avatar>
                      <Input
                        placeholder={t("decorate.apps.item.iconPlaceholder")}
                        className="flex-1"
                        disabled={isPending}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tagIds"
              render={({ field }) => {
                const selectedTags = tags.filter((t) => field.value.includes(t.id));
                return (
                  <FormItem>
                    <FormLabel>{t("decorate.apps.item.tagCategory")}</FormLabel>
                    <FormControl>
                      <Combobox<ConsoleTag, true>
                        multiple
                        value={selectedTags}
                        onValueChange={(items) => field.onChange(items.map((t) => t.id))}
                        items={tags}
                        itemToStringLabel={(item) => item.name}
                        itemToStringValue={(item) => item.id}
                        isItemEqualToValue={(a, b) => a.id === b.id}
                        disabled={isPending}
                      >
                        <ComboboxChips
                          ref={anchor}
                          className="min-h-9 w-full rounded-md text-sm shadow-xs focus-within:ring-[3px]"
                        >
                          {selectedTags.map((tag) => (
                            <ComboboxChip
                              key={tag.id}
                              className="bg-secondary text-secondary-foreground h-5 rounded-4xl border border-transparent px-2 py-0.5 text-xs"
                            >
                              {tag.name}
                            </ComboboxChip>
                          ))}
                          <ComboboxChipsInput
                            placeholder={t("decorate.apps.item.selectTags")}
                            className="placeholder:text-muted-foreground text-base md:text-sm"
                          />
                        </ComboboxChips>
                        <ComboboxContent anchor={anchor} container={container}>
                          <ComboboxEmpty>{t("decorate.apps.item.noMatchTag")}</ComboboxEmpty>
                          <ComboboxList>
                            {(item: ConsoleTag) => (
                              <ComboboxItem key={item.id} value={item}>
                                {item.name}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="visible"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between gap-4">
                  <FormLabel htmlFor="visible" className="flex-1">
                    {t("decorate.apps.item.isVisible")}
                  </FormLabel>
                  <FormControl>
                    <Switch
                      id="visible"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="mb-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {t("decorate.apps.cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t("decorate.apps.saving") : t("decorate.apps.save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
