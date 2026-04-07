import { useI18n } from "@buildingai/i18n";
import {
  useSetWebsiteConfigMutation,
  useWebsiteConfigQuery,
  type WebsiteConfigResponse,
  type WebsiteCopyright as ApiCopyright,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
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
  const { t } = useI18n();
  const { data: rawData, isLoading } = useWebsiteConfigQuery();
  const data = rawData as WebsiteConfigResponse | undefined;
  const setMutation = useSetWebsiteConfigMutation({
    onSuccess: () => toast.success(t("system.websiteConfig.copyright.saveSuccess")),
    onError: (e) => {
      console.log(`${t("system.websiteConfig.copyright.saveFailed", { message: e.message })}`);
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
        <h4 className="text-lg font-bold">{t("system.websiteConfig.copyright.filingInfo")}</h4>
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("system.websiteConfig.copyright.displayName.label")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("system.websiteConfig.copyright.displayName.placeholder")}
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="iconUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("system.websiteConfig.copyright.iconUrl.label")}</FormLabel>
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
              <FormLabel>{t("system.websiteConfig.copyright.url.label")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("system.websiteConfig.copyright.url.placeholder")}
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <h4 className="text-lg font-bold">{t("system.websiteConfig.copyright.copyrightInfo")}</h4>
        <div className="flex w-full flex-col gap-2">
          <FormLabel>{t("system.websiteConfig.copyright.copyrightInfo")}</FormLabel>
          <div className="flex w-full gap-4">
            <FormField
              control={form.control}
              name="copyrightText"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("system.websiteConfig.copyright.copyrightText.placeholder")}
                    />
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
                    <Input
                      {...field}
                      placeholder={t("system.websiteConfig.copyright.copyrightBrand.placeholder")}
                    />
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
              <FormLabel>{t("system.websiteConfig.copyright.copyrightUrl.label")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("system.websiteConfig.copyright.copyrightUrl.placeholder")}
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex gap-2">
          <PermissionGuard permissions="system-website:setConfig">
            <Button type="submit" disabled={setMutation.isPending}>
              {setMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("system.websiteConfig.copyright.save")}
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
              {t("system.websiteConfig.copyright.reset")}
            </Button>
          </PermissionGuard>
        </div>
      </form>
    </Form>
  );
}
