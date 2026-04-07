import { useI18n } from "@buildingai/i18n";
import {
  useSetWebsiteConfigMutation,
  useWebsiteConfigQuery,
  type WebsiteConfigResponse,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { THEME_COLORS, useTheme } from "@buildingai/ui/components/theme-provider";
import { ScrollThemeItems } from "@buildingai/ui/components/theme-toggle";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
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
import { ChevronsUpDown, GlobeIcon, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type InformationFormValues = {
  websiteName: string;
  websiteDescription: string;
  websiteLogo: string;
  websiteIcon: string;
  customerServiceQrcode: string;
  theme: string;
};

const defaultValues: InformationFormValues = {
  websiteName: "",
  websiteDescription: "",
  websiteLogo: "",
  websiteIcon: "",
  customerServiceQrcode: "",
  theme: "indigo",
};

/** 前台展示用的网站配置 queryKey，与 shared/config 的 useWebsiteConfigQuery 一致，失效后侧栏/标题等会重新拉取并更新 */
const WEBSITE_CONFIG_QUERY_KEY = ["config", "website"] as const;

export default function Information() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { themeColor, setThemeColor } = useTheme();
  const { data: rawData, isLoading } = useWebsiteConfigQuery();
  const data = rawData as WebsiteConfigResponse | undefined;
  const setMutation = useSetWebsiteConfigMutation({
    onSuccess: () => {
      toast.success(t("system.websiteConfig.information.saveSuccess"));
      void queryClient.invalidateQueries({ queryKey: WEBSITE_CONFIG_QUERY_KEY });
    },
    onError: (e) => {
      console.log(`${t("system.websiteConfig.information.saveFailed", { message: e.message })}`);
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
      customerServiceQrcode: w.customerServiceQrcode ?? "",
      theme: w.theme ?? "indigo",
    });
  }, [data?.webinfo, form]);

  const onSubmit = (values: InformationFormValues) => {
    setMutation.mutate({
      webinfo: {
        name: values.websiteName,
        description: values.websiteDescription,
        logo: values.websiteLogo,
        icon: values.websiteIcon,
        customerServiceQrcode: values.customerServiceQrcode || undefined,
        theme: values.theme,
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
              <FormLabel>{t("system.websiteConfig.information.websiteName.label")}</FormLabel>
              <FormDescription>
                {t("system.websiteConfig.information.websiteName.description")}
              </FormDescription>
              <FormControl>
                <InputGroup>
                  <InputGroupInput
                    placeholder={t("system.websiteConfig.information.websiteName.placeholder")}
                    {...field}
                  />
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
              <FormLabel>
                {t("system.websiteConfig.information.websiteDescription.label")}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("system.websiteConfig.information.websiteDescription.placeholder")}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t("system.websiteConfig.information.websiteDescription.description")}
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
              <FormLabel>{t("system.websiteConfig.information.websiteIcon.label")}</FormLabel>
              <FormControl>
                <ImageUpload
                  size="lg"
                  value={field.value}
                  onChange={(url) => field.onChange(url ?? "")}
                />
              </FormControl>
              <FormDescription>
                {t("system.websiteConfig.information.websiteIcon.description")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="websiteLogo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("system.websiteConfig.information.websiteLogo.label")}</FormLabel>
              <FormControl>
                <ImageUpload
                  size="lg"
                  value={field.value}
                  onChange={(url) => field.onChange(url ?? "")}
                />
              </FormControl>
              <FormDescription>
                {t("system.websiteConfig.information.websiteLogo.description")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="customerServiceQrcode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("system.websiteConfig.information.customerServiceQrcode.label")}
              </FormLabel>
              <FormControl>
                <ImageUpload
                  size="lg"
                  value={field.value}
                  onChange={(url) => field.onChange(url ?? "")}
                />
              </FormControl>
              <FormDescription>
                {t("system.websiteConfig.information.customerServiceQrcode.description")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => {
            const currentTheme = THEME_COLORS.find((t) => t.value === field.value);
            const currentThemeLabel = currentTheme?.label || "Indigo";

            return (
              <FormItem>
                <FormLabel>{t("system.websiteConfig.information.themeColor.label")}</FormLabel>
                <FormControl>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="justify-between" variant="outline">
                        <span className="flex items-center gap-2">
                          <DropdownMenuShortcut>
                            <div className="bg-primary ring-primary/15 size-1.5 rounded-full ring-2" />
                          </DropdownMenuShortcut>
                          {currentThemeLabel}
                        </span>
                        <ChevronsUpDown className="text-muted-foreground ml-1 size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="flex w-fit flex-col">
                      <DropdownMenuLabel>
                        {t("system.websiteConfig.information.themeColor.currentTheme")}
                      </DropdownMenuLabel>
                      <ScrollThemeItems
                        themeColor={themeColor}
                        onSelect={(t) => {
                          field.onChange(t);
                          setThemeColor(t);
                        }}
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </FormControl>
                <FormDescription>
                  {t("system.websiteConfig.information.themeColor.description")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <div className="flex gap-2">
          <PermissionGuard permissions="system-website:setConfig">
            <Button type="submit" disabled={setMutation.isPending}>
              {setMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("system.websiteConfig.information.save")}
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
                  customerServiceQrcode: data.webinfo.customerServiceQrcode ?? "",
                  theme: data.webinfo.theme ?? "indigo",
                })
              }
            >
              {t("system.websiteConfig.information.reset")}
            </Button>
          </PermissionGuard>
        </div>
      </form>
    </Form>
  );
}
