import {
  Merchant,
  PayConfigPayType,
  type PayConfigType,
  PayVersion,
} from "@buildingai/constants/shared/payconfig.constant";
import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import { useI18n } from "@buildingai/i18n";
import {
  PayConfigPayTypeLabels,
  type SystemPayConfigDetail,
  useSystemPayconfigDetailQuery,
  useUpdateSystemPayconfigMutation,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { FieldDescription } from "@buildingai/ui/components/ui/field";
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
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

const wechatConfigSchema = z.object({
  payVersion: z.enum([PayVersion.V2, PayVersion.V3]),
  merchantType: z.enum([Merchant.ORDINARY, Merchant.CHILD]),
  mchId: z.string().min(1, "Merchant ID is required"),
  apiKey: z.string().min(1, "Merchant API key is required"),
  paySignKey: z.string().min(1, "WeChat payment key is required"),
  cert: z.string().min(1, "WeChat payment certificate is required"),
});

const alipayConfigSchema = z.object({
  appId: z.string().min(1, "App ID is required"),
  privateKey: z.string().min(1, "Private key is required"),
  gateway: z.string().optional(),
  appCert: z.string().min(1, "App public certificate is required"),
  alipayPublicCert: z.string().min(1, "Alipay public certificate is required"),
  alipayRootCert: z.string().min(1, "Alipay root certificate is required"),
});

const formSchema = z
  .object({
    name: z.string().min(1, "Display name is required"),
    logo: z.string().min(1, "Icon is required"),
    isEnable: z.boolean(),
    isDefault: z.boolean(),
    sort: z.number().int().min(0, "Sort must be 0 or greater"),
    payType: z.number(),
    wechatConfig: wechatConfigSchema.optional(),
    alipayConfig: alipayConfigSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.payType === PayConfigPayType.WECHAT) {
        return !!data.wechatConfig;
      }
      if (data.payType === PayConfigPayType.ALIPAY) {
        return !!data.alipayConfig;
      }
      return false;
    },
    {
      message: "Please fill in complete payment config",
    },
  );

type FormValues = z.infer<typeof formSchema>;

type PayConfigFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configId: string | null;
  onSuccess?: () => void;
};

export const PayConfigFormDialog = ({
  open,
  onOpenChange,
  configId,
  onSuccess,
}: PayConfigFormDialogProps) => {
  const { t } = useI18n();
  const { data: rawDetail, isLoading: isLoadingDetail } = useSystemPayconfigDetailQuery(
    configId || "",
    { enabled: open && !!configId },
  );
  const detail = rawDetail as SystemPayConfigDetail | undefined;

  const updateMutation = useUpdateSystemPayconfigMutation({
    onSuccess: () => {
      toast.success(t("system.payConfig.paymentUpdated"));
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(t("system.payConfig.updateFailed", { message: error.message }));
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      name: "",
      logo: "",
      isEnable: true,
      isDefault: false,
      sort: 0,
      payType: PayConfigPayType.WECHAT,
      wechatConfig: undefined,
      alipayConfig: undefined,
    },
  });

  const payType = form.watch("payType");

  useEffect(() => {
    if (detail && open) {
      const isWeChat = detail.payType === PayConfigPayType.WECHAT;
      const config = detail.config as any;

      form.reset({
        name: detail.name,
        logo: detail.logo,
        isEnable: detail.isEnable === BooleanNumber.YES,
        isDefault: detail.isDefault === BooleanNumber.YES,
        sort: detail.sort,
        payType: detail.payType,
        wechatConfig: isWeChat
          ? {
              payVersion: config?.payVersion || PayVersion.V3,
              merchantType: config?.merchantType || Merchant.ORDINARY,
              mchId: config?.mchId || "",
              apiKey: config?.apiKey || "",
              paySignKey: config?.paySignKey || "",
              cert: config?.cert || "",
            }
          : undefined,
        alipayConfig: !isWeChat
          ? {
              appId: config?.appId || "",
              privateKey: config?.privateKey || "",
              gateway: config?.gateway || "",
              appCert: config?.appCert || "",
              alipayPublicCert: config?.alipayPublicCert || "",
              alipayRootCert: config?.alipayRootCert || "",
            }
          : undefined,
      });
    }
  }, [detail, open, form]);

  const onSubmit = (values: FormValues) => {
    if (!configId) return;

    const payload = {
      id: configId,
      name: values.name,
      logo: values.logo,
      isEnable: values.isEnable ? BooleanNumber.YES : BooleanNumber.NO,
      isDefault: values.isDefault ? BooleanNumber.YES : BooleanNumber.NO,
      sort: values.sort,
      payType: values.payType,
      config:
        values.payType === PayConfigPayType.WECHAT ? values.wechatConfig : values.alipayConfig,
    };

    updateMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("system.payConfig.form.editPaymentConfig")}</DialogTitle>
          <DialogDescription>
            {payType === PayConfigPayType.WECHAT
              ? t("system.payConfig.form.wechatPayConfig")
              : t("system.payConfig.form.alipayConfig")}
          </DialogDescription>
        </DialogHeader>

        {isLoadingDetail ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <ScrollArea className="h-[60vh] **:data-[slot=scroll-area-scrollbar]:hidden">
                <div className="space-y-4 px-1">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="payType"
                      render={({ field }) => {
                        const displayText =
                          PayConfigPayTypeLabels[field.value as PayConfigType] ??
                          t("system.payConfig.unknownPayment");
                        return (
                          <FormItem>
                            <FormLabel>{t("system.payConfig.form.paymentMethod")}</FormLabel>
                            <FormControl>
                              <Input value={displayText} disabled />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t("system.payConfig.form.displayName")}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={t("system.payConfig.form.displayNamePlaceholder")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="logo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("system.payConfig.form.icon")}</FormLabel>
                          <FormControl>
                            <ImageUpload
                              className="h-16 w-16!"
                              size="lg"
                              value={field.value ?? ""}
                              onChange={(url) => field.onChange(url ?? "")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t("system.payConfig.form.sortWeight")}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              placeholder={t("system.payConfig.form.sortWeightPlaceholder")}
                            />
                          </FormControl>
                          <FormDescription>
                            {t("system.payConfig.form.sortWeightDescription")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* 微信支付配置 */}
                  {payType === PayConfigPayType.WECHAT && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="wechatConfig.payVersion"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t("system.payConfig.form.wechatPayVersion")}
                                <span className="text-destructive">*</span>
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value ?? PayVersion.V3}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue
                                      placeholder={t("system.payConfig.form.wechatPayVersion")}
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value={PayVersion.V3}>V3</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="wechatConfig.merchantType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t("system.payConfig.form.merchantType")}
                                <span className="text-destructive">*</span>
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value ?? Merchant.ORDINARY}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue
                                      placeholder={t("system.payConfig.form.merchantType")}
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value={Merchant.ORDINARY}>普通商户</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FieldDescription>
                        {t("system.payConfig.form.wechatAppidNotice")}{" "}
                        <Link to="/console/channel/wechat-oa" className="text-primary">
                          {t("system.payConfig.form.wechatChannelConfig")}
                        </Link>{" "}
                        {t("system.payConfig.form.wechatChannelConfigNotice")}
                      </FieldDescription>
                      <FormField
                        control={form.control}
                        name="wechatConfig.mchId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("system.payConfig.form.wechatMchId")}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("system.payConfig.form.wechatMchIdPlaceholder")}
                              />
                            </FormControl>
                            <FormDescription>
                              {t("system.payConfig.form.wechatMchIdDescription")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="wechatConfig.apiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("system.payConfig.form.merchantApiKey")}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={t("system.payConfig.form.merchantApiKeyPlaceholder")}
                                className="h-24 resize-none font-mono text-sm"
                              />
                            </FormControl>
                            <FormDescription>
                              {t("system.payConfig.form.merchantApiKeyDescription")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="wechatConfig.cert"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("system.payConfig.form.wechatPayCert")}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={5}
                                placeholder={t("system.payConfig.form.wechatPayCertPlaceholder")}
                                className="h-24 resize-none font-mono text-sm"
                              />
                            </FormControl>
                            <FormDescription>
                              {t("system.payConfig.form.wechatPayCertDescription")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="wechatConfig.paySignKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("system.payConfig.form.wechatPayKey")}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={t("system.payConfig.form.wechatPayKeyPlaceholder")}
                                className="h-24 resize-none font-mono text-sm"
                              />
                            </FormControl>
                            <FormDescription>
                              {t("system.payConfig.form.wechatPayKeyDescription")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* 支付宝配置 */}
                  {payType === PayConfigPayType.ALIPAY && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="alipayConfig.appId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("system.payConfig.form.appId")}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("system.payConfig.form.appIdPlaceholder")}
                              />
                            </FormControl>
                            <FormDescription>
                              {t("system.payConfig.form.appIdDescription")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="alipayConfig.gateway"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("system.payConfig.form.gatewayAddress")}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("system.payConfig.form.gatewayAddressPlaceholder")}
                              />
                            </FormControl>
                            <FormDescription>
                              {t("system.payConfig.form.gatewayAddressDescription")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="alipayConfig.privateKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("system.payConfig.form.appPrivateKey")}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={t("system.payConfig.form.appPrivateKeyPlaceholder")}
                                className="h-24 resize-none font-mono text-sm"
                              />
                            </FormControl>
                            <FormDescription>
                              {t("system.payConfig.form.appPrivateKeyDescription")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="alipayConfig.appCert"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("system.payConfig.form.appPublicCert")}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={t("system.payConfig.form.appPublicCertPlaceholder")}
                                className="h-24 resize-none font-mono text-sm"
                              />
                            </FormControl>
                            <FormDescription>
                              {t("system.payConfig.form.appPublicCertDescription")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="alipayConfig.alipayPublicCert"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("system.payConfig.form.alipayPublicCert")}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={t("system.payConfig.form.alipayPublicCertPlaceholder")}
                                className="h-24 resize-none font-mono text-sm"
                              />
                            </FormControl>
                            <FormDescription>
                              {t("system.payConfig.form.alipayPublicCertDescription")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="alipayConfig.alipayRootCert"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("system.payConfig.form.alipayRootCert")}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={t("system.payConfig.form.alipayRootCertPlaceholder")}
                                className="h-24 resize-none font-mono text-sm"
                              />
                            </FormControl>
                            <FormDescription>
                              {t("system.payConfig.form.alipayRootCertDescription")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={updateMutation.isPending}
                >
                  {t("system.payConfig.form.cancel")}
                </Button>
                <PermissionGuard permissions="system-payconfig:update">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {t("system.payConfig.form.save")}
                  </Button>
                </PermissionGuard>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
