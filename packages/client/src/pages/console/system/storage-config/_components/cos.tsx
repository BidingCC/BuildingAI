import type { TencentCosConfig } from "@buildingai/constants/shared/storage-config.constant";
import {
  useStorageConfigDetailQuery,
  useUpdateStorageConfigMutation,
} from "@buildingai/services/console";
import { invalidateStorageConfigCache } from "@buildingai/services/shared";
import { Button } from "@buildingai/ui/components/ui/button";
import { Card, CardContent } from "@buildingai/ui/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@buildingai/ui/components/ui/form";
import { Input } from "@buildingai/ui/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Cloud, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const OssSchema = z.object({
  bucket: z.string().min(1, "请输入存储空间名称"),
  accessKey: z.string().min(1, "请输入 SecretID"),
  secretKey: z.string().min(1, "请输入 SecretKey"),
  domain: z
    .string()
    .min(1, "请输入空间域名")
    .url("请输入合法的 URL")
    .refine((value) => value.startsWith("https://"), "域名必须以 https:// 开头"),
  region: z.string().min(1, "请输入 region"),
});

type OssStorageFormValues = z.infer<typeof OssSchema>;

interface OssProps {
  configId?: string;
}

const Oss = ({ configId }: OssProps) => {
  const {
    data,
    isLoading: isDetailLoading,
    refetch,
  } = useStorageConfigDetailQuery(configId, {
    enabled: !!configId,
  });

  const form = useForm<OssStorageFormValues>({
    resolver: zodResolver(OssSchema),
    defaultValues: {
      bucket: "",
      accessKey: "",
      secretKey: "",
      region: "",
      domain: "",
    },
  });

  useEffect(() => {
    if (!data?.config) return;
    const config = data.config as TencentCosConfig;
    form.reset({
      bucket: config.bucket ?? "",
      accessKey: config.accessKey ?? "",
      secretKey: config.secretKey ?? "",
      domain: config.domain ?? "",
      region: config.region ?? "",
    });
  }, [data, form]);

  const updateMutation = useUpdateStorageConfigMutation({
    onSuccess: () => {
      invalidateStorageConfigCache();
      toast.success("保存成功");
      refetch();
    },
    onError: (e) => {
      console.log(`保存失败: ${e.message}`);
    },
  });

  const onSubmit = (values: OssStorageFormValues) => {
    if (!configId) {
      toast.error("未找到 OSS 存储配置记录");
      return;
    }
    updateMutation.mutate({
      id: configId,
      dto: {
        isActive: data?.isActive ?? false,
        storageType: "cos",
        config: values,
      },
    });
  };

  const handleEnable = () => {
    if (!configId) {
      toast.error("未找到 OSS 存储配置记录");
      return;
    }
    const values = form.getValues();
    updateMutation.mutate({
      id: configId,
      dto: {
        isActive: true,
        storageType: "cos",
        config: values,
      },
    });
  };
  if (!configId || isDetailLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                <Cloud className="text-primary size-5" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">腾讯云COS</span>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant={data?.isActive ? "outline" : "default"}
              disabled={data?.isActive || updateMutation.isPending}
              onClick={handleEnable}
            >
              {updateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {data?.isActive ? "已启用" : "启用"}
            </Button>
          </CardContent>
        </Card>
        <FormField
          control={form.control}
          name="bucket"
          render={({ field }) => (
            <FormItem>
              <FormLabel>储存空间名称</FormLabel>
              <FormControl>
                <Input placeholder="请输入存储空间名称 (Bucket)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="accessKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SecretID</FormLabel>
              <FormControl>
                <Input placeholder="请输入 SecretID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="secretKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SecretKey</FormLabel>
              <FormControl>
                <Input placeholder="请输入 SecretKey" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="domain"
          render={({ field }) => (
            <FormItem>
              <FormLabel>空间域名</FormLabel>
              <FormControl>
                <Input placeholder="请输入空间域名 (Domain)" {...field} />
              </FormControl>
              <FormDescription>
                请补全 http:// 或 https://，例如https://static.cloud.com
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="region"
          render={({ field }) => (
            <FormItem>
              <FormLabel>REGION</FormLabel>
              <FormControl>
                <Input placeholder="请输入 region" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            保存设置
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              data?.config &&
              form.reset({
                bucket: data.config.bucket ?? "",
                accessKey: data.config.accessKey ?? "",
                secretKey: data.config.secretKey ?? "",
                domain: data.config.domain ?? "",
              })
            }
          >
            重置设置
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default Oss;
