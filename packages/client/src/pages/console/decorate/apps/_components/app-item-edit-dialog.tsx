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
  displayName: z.string().min(1, "显示名称不能为空"),
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
          <DialogTitle>编辑应用</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form ref={setContainer} className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="appName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>应用名称</FormLabel>
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
                  <FormLabel htmlFor="display-name">显示名称</FormLabel>
                  <FormControl>
                    <Input
                      id="display-name"
                      placeholder="请输入显示名称"
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
                  <FormLabel htmlFor="description">应用描述</FormLabel>
                  <FormControl>
                    <Input
                      id="description"
                      placeholder="请输入应用描述"
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
                  <FormLabel>应用图标</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-12">
                        <AvatarImage src={field.value || undefined} alt="" />
                        <AvatarFallback>
                          {form.watch("displayName").slice(0, 2).toUpperCase() || "APP"}
                        </AvatarFallback>
                      </Avatar>
                      <Input
                        placeholder="图标 URL"
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
                    <FormLabel>标签分类</FormLabel>
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
                            placeholder="请选择标签..."
                            className="placeholder:text-muted-foreground text-base md:text-sm"
                          />
                        </ComboboxChips>
                        <ComboboxContent anchor={anchor} container={container}>
                          <ComboboxEmpty>未找到匹配的标签</ComboboxEmpty>
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
                    是否显示
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
                取消
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "保存中…" : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
