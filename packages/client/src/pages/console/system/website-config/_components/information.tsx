import { useSetWebsiteConfigMutation, useWebsiteConfigQuery } from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@buildingai/ui/components/ui/input-group";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { GlobeIcon, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type InformationFormValues = {
  websiteName: string;
  websiteDescription: string;
  websiteLogo: string;
  websiteIcon: string;
  spaLoadingIcon: string;
};

const defaultValues: InformationFormValues = {
  websiteName: "",
  websiteDescription: "",
  websiteLogo: "",
  websiteIcon: "",
  spaLoadingIcon: "",
};

/** 前台展示用的网站配置 queryKey，与 shared/config 的 useWebsiteConfigQuery 一致，失效后侧栏/标题等会重新拉取并更新 */
const WEBSITE_CONFIG_QUERY_KEY = ["config", "website"] as const;

export default function Information() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useWebsiteConfigQuery();
  const setMutation = useSetWebsiteConfigMutation({
    onSuccess: () => {
      toast.success("保存成功");
      void queryClient.invalidateQueries({ queryKey: WEBSITE_CONFIG_QUERY_KEY });
    },
    onError: (e) => {
      console.log(`保存失败: ${e.message}`);
    },
  });

  const form = useForm<InformationFormValues>({
    defaultValues,
  });

  useEffect(() => {
    if (!data?.webinfo) return;
    const w = data.webinfo;
    form.reset({
      websiteName: w.name ?? "",
      websiteDescription: w.description ?? "",
      websiteLogo: w.logo ?? "",
      websiteIcon: w.icon ?? "",
      spaLoadingIcon: w.spaLoadingIcon ?? "",
    });
  }, [data?.webinfo, form]);

  const onSubmit = (values: InformationFormValues) => {
    setMutation.mutate({
      webinfo: {
        name: values.websiteName,
        description: values.websiteDescription,
        logo: values.websiteLogo,
        icon: values.websiteIcon,
        spaLoadingIcon: values.spaLoadingIcon,
      },
    });
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="websiteName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>网站名称</FormLabel>
              <FormDescription>网站名称将显示在浏览器标签页和系统各处</FormDescription>
              <FormControl>
                <InputGroup>
                  <InputGroupInput placeholder="请输入网站名称" {...field} />
                  <InputGroupAddon>
                    <GlobeIcon />
                  </InputGroupAddon>
                </InputGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="websiteDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>网站描述</FormLabel>
              <FormControl>
                <Textarea placeholder="请输入网站描述" {...field} />
              </FormControl>
              <FormDescription>
                网站的简短描述，将显示在搜索引擎结果和社交媒体分享中
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="websiteIcon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>网站图标</FormLabel>
              <FormControl>
                <ImageUpload
                  size="lg"
                  value={field.value}
                  onChange={(url) => field.onChange(url ?? "")}
                />
              </FormControl>
              <FormDescription>推荐尺寸: 100x100px, 支持格式: PNG, ICO, JPG</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="websiteLogo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>网站 Logo</FormLabel>
              <FormControl>
                <ImageUpload
                  size="lg"
                  value={field.value}
                  onChange={(url) => field.onChange(url ?? "")}
                />
              </FormControl>
              <FormDescription>推荐尺寸: 100x100px, 支持格式: PNG, JPG, JPEG</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="spaLoadingIcon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>加载图标</FormLabel>
              <FormControl>
                <ImageUpload
                  size="lg"
                  value={field.value}
                  onChange={(url) => field.onChange(url ?? "")}
                />
              </FormControl>
              <FormDescription>推荐高度尺寸: 48px, 支持格式: PNG, JPG, JPEG</FormDescription>
              <FormMessage />
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
              data?.webinfo &&
              form.reset({
                websiteName: data.webinfo.name ?? "",
                websiteDescription: data.webinfo.description ?? "",
                websiteLogo: data.webinfo.logo ?? "",
                websiteIcon: data.webinfo.icon ?? "",
                spaLoadingIcon: data.webinfo.spaLoadingIcon ?? "",
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
