import {
  useSetWebsiteConfigMutation,
  useWebsiteConfigQuery,
  type WebsiteCopyright as ApiCopyright,
} from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@buildingai/ui/components/ui/form";
import { ImageUpload } from "@buildingai/ui/components/ui/image-upload";
import { Input } from "@buildingai/ui/components/ui/input";
import { Separator } from "@buildingai/ui/components/ui/separator";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export type CopyrightFormValues = {
  displayName: string;
  iconUrl: string;
  url: string;
  copyrightText: string;
  copyrightBrand: string;
  copyrightUrl: string;
};

const defaultValues: CopyrightFormValues = {
  displayName: "",
  iconUrl: "",
  url: "",
  copyrightText: "",
  copyrightBrand: "",
  copyrightUrl: "",
};

export default function Copyright() {
  const { data, isLoading } = useWebsiteConfigQuery();
  const setMutation = useSetWebsiteConfigMutation({
    onSuccess: () => toast.success("保存成功"),
    onError: (e) => {
      console.log(`保存失败: ${e.message}`);
    },
  });

  const form = useForm<CopyrightFormValues>({ defaultValues });

  useEffect(() => {
    if (!data?.copyright) return;
    const c = data.copyright;
    form.reset({
      displayName: c.displayName ?? "",
      iconUrl: c.iconUrl ?? "",
      url: c.url ?? "",
      copyrightText: c.copyrightText ?? "",
      copyrightBrand: c.copyrightBrand ?? "",
      copyrightUrl: c.copyrightUrl ?? "",
    });
  }, [data?.copyright, form]);

  const onSubmit = (values: CopyrightFormValues) => {
    setMutation.mutate({
      copyright: values as ApiCopyright,
    });
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  const loadedCopyright = data?.copyright;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <h4 className="text-lg font-bold">备案信息</h4>
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>备案信息</FormLabel>
              <FormControl>
                <Input placeholder="请输入备案信息" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="iconUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>备案图标</FormLabel>
              <FormControl>
                <ImageUpload
                  size="lg"
                  value={field.value}
                  onChange={(url) => field.onChange(url ?? "")}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>备案跳转链接</FormLabel>
              <FormControl>
                <Input placeholder="请输入备案跳转链接" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Separator className="border-border border-t border-dashed bg-transparent data-[orientation=horizontal]:h-0" />
        <h4 className="text-lg font-bold">版权信息</h4>
        <div className="flex w-full flex-col gap-2">
          <FormLabel>版权信息</FormLabel>
          <div className="flex w-full gap-4">
            <FormField
              control={form.control}
              name="copyrightText"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input {...field} placeholder="请输入版权信息，如 © 2024" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="copyrightBrand"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input {...field} placeholder="请输入品牌/公司名称" />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
        <FormField
          control={form.control}
          name="copyrightUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>跳转链接</FormLabel>
              <FormControl>
                <Input placeholder="请输入跳转链接" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={setMutation.isPending}>
            {setMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            保存
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              loadedCopyright &&
              form.reset({
                displayName: loadedCopyright.displayName ?? "",
                iconUrl: loadedCopyright.iconUrl ?? "",
                url: loadedCopyright.url ?? "",
                copyrightText: loadedCopyright.copyrightText ?? "",
                copyrightBrand: loadedCopyright.copyrightBrand ?? "",
                copyrightUrl: loadedCopyright.copyrightUrl ?? "",
              })
            }
          >
            重置
          </Button>
        </div>
      </form>
    </Form>
  );
}
