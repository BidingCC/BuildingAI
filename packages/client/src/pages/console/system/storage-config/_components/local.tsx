import { useI18n } from "@buildingai/i18n";
import {
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
} from "@buildingai/ui/components/ui/form";
import { Input } from "@buildingai/ui/components/ui/input";
import { HardDrive, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type LocalStorageFormValues = {
  localStorage: string;
  domain: string;
};

interface LocalProps {
  configId?: string;
}

const Local = ({ configId }: LocalProps) => {
  const { t } = useI18n();
  const {
    data,
    isLoading: isDetailLoading,
    refetch,
  } = useStorageConfigDetailQuery(configId, {
    enabled: !!configId,
  });

  const form = useForm<LocalStorageFormValues>({
    defaultValues: {
      localStorage: "",
      domain: "",
    },
  });

  useEffect(() => {
    if (!data?.config) return;
    form.reset({
      localStorage: data.config.localStorage ?? "",
      domain: data.config.domain ?? "",
    });
  }, [data, form]);

  const updateMutation = useUpdateStorageConfigMutation({
    onSuccess: () => {
      invalidateStorageConfigCache();
      toast.success(t("system.storageConfig.local.switchToLocal"));
      refetch();
    },
    onError: (e) => {
      console.log(`${t("system.storageConfig.local.switchFailed", { message: e.message })}`);
    },
  });

  const onSubmit = (_data: LocalStorageFormValues) => {
    // 本地存储为只读展示，无需提交
  };

  const handleEnable = () => {
    if (!configId) {
      toast.error(t("system.storageConfig.local.notFound"));
      return;
    }
    updateMutation.mutate({
      id: configId,
      dto: {
        isActive: true,
        storageType: "local",
        config: null,
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
                <HardDrive className="text-primary size-5" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{t("system.storageConfig.local.title")}</span>
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
                  ? t("system.storageConfig.local.enabled")
                  : t("system.storageConfig.local.disabled")}
              </Button>
            </PermissionGuard>
          </CardContent>
        </Card>
        <FormField
          control={form.control}
          name="localStorage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("system.storageConfig.local.storagePath")}</FormLabel>
              <FormControl>
                <Input {...field} disabled />
              </FormControl>
              <FormDescription>
                {t("system.storageConfig.local.storagePathDescription")}
              </FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="domain"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("system.storageConfig.local.accessDomain")}</FormLabel>
              <FormControl>
                <Input {...field} disabled />
              </FormControl>
              <FormDescription>
                {t("system.storageConfig.local.accessDomainDescription")}
              </FormDescription>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};

export default Local;
