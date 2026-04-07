import { useI18n } from "@buildingai/i18n";
import {
  type AliyunOssConfig,
  useStorageConfigDetailQuery,
  useUpdateStorageConfigMutation,
} from "@buildingai/services/console";
import { invalidateStorageConfigCache } from "@buildingai/services/shared";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
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

const ossSchema = z.object({
  bucket: z.string().min(1, "Please enter bucket name"),
  accessKey: z.string().min(1, "Please enter ACCESS_KEY"),
  secretKey: z.string().min(1, "Please enter SECRET_KEY"),
  domain: z
    .string()
    .min(1, "Please enter domain")
    .url("Please enter a valid URL")
    .refine((value) => value.startsWith("https://"), "Domain must start with https://"),
  region: z.string().min(1, "Please enter region"),
  arn: z.string().min(1, "Please enter ARN"),
});

type OssStorageFormValues = z.infer<typeof ossSchema>;

interface OssProps {
  configId?: string;
}

const Oss = ({ configId }: OssProps) => {
  const { t } = useI18n();
  const {
    data,
    isLoading: isDetailLoading,
    refetch,
  } = useStorageConfigDetailQuery(configId, {
    enabled: !!configId,
  });

  const form = useForm<OssStorageFormValues>({
    resolver: zodResolver(ossSchema),
    defaultValues: {
      bucket: "",
      accessKey: "",
      secretKey: "",
      domain: "",
      region: "",
      arn: "",
    },
  });

  useEffect(() => {
    if (!data?.config) return;
    const config = data.config as AliyunOssConfig;
    form.reset({
      bucket: config.bucket ?? "",
      accessKey: config.accessKey ?? "",
      secretKey: config.secretKey ?? "",
      domain: config.domain ?? "",
      region: config.region ?? "",
      arn: config.arn ?? "",
    });
  }, [data, form]);

  const updateMutation = useUpdateStorageConfigMutation({
    onSuccess: () => {
      invalidateStorageConfigCache();
      toast.success(t("system.storageConfig.oss.saveSuccess"));
      refetch();
    },
    onError: (e) => {
      console.log(`${t("system.storageConfig.oss.saveFailed", { message: e.message })}`);
    },
  });

  const onSubmit = (values: OssStorageFormValues) => {
    if (!configId) {
      toast.error(t("system.storageConfig.oss.notFound"));
      return;
    }
    updateMutation.mutate({
      id: configId,
      dto: {
        isActive: data?.isActive ?? false,
        storageType: "oss",
        config: values,
      },
    });
  };

  const handleEnable = () => {
    if (!configId) {
      toast.error(t("system.storageConfig.oss.notFound"));
      return;
    }
    const values = form.getValues();
    updateMutation.mutate({
      id: configId,
      dto: {
        isActive: true,
        storageType: "oss",
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
                <span className="text-sm font-medium">{t("system.storageConfig.oss.title")}</span>
              </div>
            </div>
            <PermissionGuard permissions="system-storage-config:set">
              <Button
                type="button"
                size="sm"
                variant={data?.isActive ? "outline" : "default"}
                disabled={data?.isActive || updateMutation.isPending}
                onClick={handleEnable}
              >
                {updateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {data?.isActive
                  ? t("system.storageConfig.oss.enabled")
                  : t("system.storageConfig.oss.disabled")}
              </Button>
            </PermissionGuard>
          </CardContent>
        </Card>
        <FormField
          control={form.control}
          name="bucket"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("system.storageConfig.oss.bucket")}</FormLabel>
              <FormControl>
                <Input placeholder={t("system.storageConfig.oss.bucketPlaceholder")} {...field} />
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
              <FormLabel>{t("system.storageConfig.oss.accessKey")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("system.storageConfig.oss.accessKeyPlaceholder")}
                  {...field}
                />
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
              <FormLabel>{t("system.storageConfig.oss.secretKey")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("system.storageConfig.oss.secretKeyPlaceholder")}
                  {...field}
                />
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
              <FormLabel>{t("system.storageConfig.oss.domain")}</FormLabel>
              <FormControl>
                <Input placeholder={t("system.storageConfig.oss.domainPlaceholder")} {...field} />
              </FormControl>
              <FormDescription>{t("system.storageConfig.oss.domainDescription")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="region"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("system.storageConfig.oss.region")}</FormLabel>
              <FormControl>
                <Input placeholder={t("system.storageConfig.oss.regionPlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="arn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("system.storageConfig.oss.arn")}</FormLabel>
              <FormControl>
                <Input placeholder={t("system.storageConfig.oss.arnPlaceholder")} {...field} />
              </FormControl>
              <FormDescription>{t("system.storageConfig.oss.arnDescription")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center gap-2">
          <PermissionGuard permissions="system-storage-config:set">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("system.storageConfig.oss.save")}
            </Button>
          </PermissionGuard>
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
                region: data.config.region ?? "",
                arn: data.config.arn ?? "",
              })
            }
          >
            {t("system.storageConfig.oss.reset")}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default Oss;
