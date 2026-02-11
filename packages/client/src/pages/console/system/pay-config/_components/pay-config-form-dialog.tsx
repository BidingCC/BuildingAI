import {
  Merchant,
  PayConfigPayType,
  type PayConfigType,
  PayVersion,
} from "@buildingai/constants/shared/payconfig.constant";
import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import {
  PayConfigPayTypeLabels,
  useSystemPayconfigDetailQuery,
  useUpdateSystemPayconfigMutation,
} from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@buildingai/ui/components/ui/field";
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
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const wechatConfigSchema = z.object({
  payVersion: z.enum([PayVersion.V2, PayVersion.V3]),
  merchantType: z.enum([Merchant.ORDINARY, Merchant.CHILD]),
  mchId: z.string().min(1, "商户号不能为空"),
  apiKey: z.string().min(1, "商户API密钥不能为空"),
  paySignKey: z.string().min(1, "微信支付密钥不能为空"),
  cert: z.string().min(1, "微信支付证书不能为空"),
  appId: z.string().min(1, "AppID不能为空"),
});

const alipayConfigSchema = z.object({
  appId: z.string().min(1, "AppID不能为空"),
  privateKey: z.string().min(1, "应用私钥不能为空"),
  gateway: z.string().optional(),
  appCert: z.string().min(1, "应用公钥证书不能为空"),
  alipayPublicCert: z.string().min(1, "支付宝公钥证书不能为空"),
  alipayRootCert: z.string().min(1, "支付宝根证书不能为空"),
});

const formSchema = z
  .object({
    name: z.string().min(1, "显示名称不能为空"),
    logo: z.string().min(1, "图标不能为空"),
    isEnable: z.boolean(),
    isDefault: z.boolean(),
    sort: z.number().int().min(0, "排序必须大于等于0"),
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
      message: "请填写完整的支付配置",
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
  const { data: detail, isLoading: isLoadingDetail } = useSystemPayconfigDetailQuery(
    configId || "",
    { enabled: open && !!configId },
  );

  const updateMutation = useUpdateSystemPayconfigMutation({
    onSuccess: () => {
      toast.success("支付配置已更新");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
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
              appId: config?.appId || "",
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
          <DialogTitle>编辑支付配置</DialogTitle>
          <DialogDescription>
            {payType === PayConfigPayType.WECHAT ? "微信支付配置" : "支付宝支付配置"}
          </DialogDescription>
        </DialogHeader>

        {isLoadingDetail ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4 px-1">
                {/* 基础信息 */}
                <FieldGroup className="gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      name="payType"
                      control={form.control}
                      render={({ field }) => {
                        const displayText =
                          PayConfigPayTypeLabels[field.value as PayConfigType] ?? "未知支付方式";
                        return (
                          <Field className="gap-2">
                            <FieldLabel>支付方式</FieldLabel>
                            <Input value={displayText} disabled />
                          </Field>
                        );
                      }}
                    />
                    <Controller
                      name="name"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field className="gap-2" data-invalid={!!fieldState.error}>
                          <FieldLabel htmlFor="name">显示名称</FieldLabel>
                          <Input
                            id="name"
                            {...field}
                            placeholder="请输入显示名称"
                            aria-invalid={!!fieldState.error}
                          />
                          {fieldState.error && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      name="logo"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field className="gap-2" data-invalid={!!fieldState.error}>
                          <FieldLabel htmlFor="logo">图标地址</FieldLabel>
                          <Input
                            id="logo"
                            {...field}
                            placeholder="请输入图标URL"
                            aria-invalid={!!fieldState.error}
                          />
                          {fieldState.error && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="sort"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field className="gap-2" data-invalid={!!fieldState.error}>
                          <FieldLabel htmlFor="sort">排序权重</FieldLabel>
                          <Input
                            id="sort"
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            placeholder="请输入排序权重"
                            aria-invalid={!!fieldState.error}
                          />
                          {fieldState.error && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>

                  {/* 微信支付配置 */}
                  {payType === PayConfigPayType.WECHAT && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Controller
                          name="wechatConfig.payVersion"
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <Field className="gap-2" data-invalid={!!fieldState.error}>
                              <FieldLabel>微信支付接口版本</FieldLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value ?? PayVersion.V3}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="选择支付版本" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={PayVersion.V3}>V3</SelectItem>
                                </SelectContent>
                              </Select>
                              <FieldDescription>暂时只支持V3版本</FieldDescription>
                              {fieldState.error && <FieldError errors={[fieldState.error]} />}
                            </Field>
                          )}
                        />
                        <Controller
                          name="wechatConfig.merchantType"
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <Field className="gap-2" data-invalid={!!fieldState.error}>
                              <FieldLabel>商户类型</FieldLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value ?? Merchant.ORDINARY}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="选择商户类型" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={Merchant.ORDINARY}>普通商户</SelectItem>
                                </SelectContent>
                              </Select>
                              <FieldDescription>
                                暂时只支持普通商户类型，服务商户类型模式暂不支持
                              </FieldDescription>
                              {fieldState.error && <FieldError errors={[fieldState.error]} />}
                            </Field>
                          )}
                        />
                      </div>
                      <Controller
                        name="wechatConfig.appId"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field className="gap-2" data-invalid={!!fieldState.error}>
                            <FieldLabel htmlFor="wechatConfig.appId">AppID</FieldLabel>
                            <Input
                              id="wechatConfig.appId"
                              {...field}
                              placeholder="请输入AppID"
                              aria-invalid={!!fieldState.error}
                            />
                            <FieldDescription>请填写开发平台申请的应用 ID 信息</FieldDescription>
                            {fieldState.error && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                      <Controller
                        name="wechatConfig.mchId"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field className="gap-2" data-invalid={!!fieldState.error}>
                            <FieldLabel htmlFor="wechatConfig.mchId">微信商户号</FieldLabel>
                            <Input
                              id="wechatConfig.mchId"
                              {...field}
                              placeholder="请输入商户号"
                              aria-invalid={!!fieldState.error}
                            />
                            <FieldDescription>微信支付商户号（MCHID）</FieldDescription>
                            {fieldState.error && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                      <Controller
                        name="wechatConfig.apiKey"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field className="gap-2" data-invalid={!!fieldState.error}>
                            <FieldLabel>商户API密钥</FieldLabel>
                            <Textarea
                              {...field}
                              placeholder="请输入商户API密钥"
                              className="font-mono text-sm"
                              aria-invalid={!!fieldState.error}
                            />
                            <FieldDescription>微信支付商户API密钥(paySignKey)</FieldDescription>
                            {fieldState.error && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                      <Controller
                        name="wechatConfig.paySignKey"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field className="gap-2" data-invalid={!!fieldState.error}>
                            <FieldLabel>微信支付密钥</FieldLabel>
                            <Textarea
                              {...field}
                              placeholder="请输入微信支付密钥"
                              className="font-mono text-sm"
                              aria-invalid={!!fieldState.error}
                            />
                            <FieldDescription>
                              微信支付证书密钥（apiclient_key.pem），前往微信商家平台生成并黏贴至此处
                            </FieldDescription>
                            {fieldState.error && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                      <Controller
                        name="wechatConfig.cert"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field className="gap-2" data-invalid={!!fieldState.error}>
                            <FieldLabel>微信支付证书</FieldLabel>
                            <Textarea
                              {...field}
                              rows={5}
                              placeholder="请输入微信支付证书内容"
                              className="font-mono text-sm"
                              aria-invalid={!!fieldState.error}
                            />
                            <FieldDescription>
                              微信支付证书（apiclient_cert.pem），前往微信商家平台生成并黏贴至此处
                            </FieldDescription>
                            {fieldState.error && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                    </div>
                  )}

                  {/* 支付宝配置 */}
                  {payType === PayConfigPayType.ALIPAY && (
                    <div className="space-y-4">
                      <Controller
                        name="alipayConfig.appId"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field className="gap-2" data-invalid={!!fieldState.error}>
                            <FieldLabel htmlFor="alipayConfig.appId">AppID</FieldLabel>
                            <Input
                              id="alipayConfig.appId"
                              {...field}
                              placeholder="请输入AppID"
                              aria-invalid={!!fieldState.error}
                            />
                            <FieldDescription>请填写开发平台申请的应用 ID 信息</FieldDescription>
                            {fieldState.error && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                      <Controller
                        name="alipayConfig.gateway"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field className="gap-2" data-invalid={!!fieldState.error}>
                            <FieldLabel htmlFor="alipayConfig.gateway">网关地址</FieldLabel>
                            <Input
                              id="alipayConfig.gateway"
                              {...field}
                              placeholder="请输入网关地址"
                              aria-invalid={!!fieldState.error}
                            />
                            <FieldDescription>支付宝开放平台网关地址</FieldDescription>
                            {fieldState.error && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                      <Controller
                        name="alipayConfig.privateKey"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field className="gap-2" data-invalid={!!fieldState.error}>
                            <FieldLabel>应用私钥</FieldLabel>
                            <Textarea
                              {...field}
                              placeholder="请输入应用私钥"
                              className="font-mono text-sm"
                              aria-invalid={!!fieldState.error}
                            />
                            <FieldDescription>应用私钥内容(PKCS8格式)</FieldDescription>
                            {fieldState.error && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                      <Controller
                        name="alipayConfig.appCert"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field className="gap-2" data-invalid={!!fieldState.error}>
                            <FieldLabel>应用公钥证书</FieldLabel>
                            <Textarea
                              {...field}
                              placeholder="请输入应用公钥证书内容"
                              className="font-mono text-sm"
                              aria-invalid={!!fieldState.error}
                            />
                            <FieldDescription>应用公钥证书内容(appCertPublicKey)</FieldDescription>
                            {fieldState.error && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                      <Controller
                        name="alipayConfig.alipayPublicCert"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field className="gap-2" data-invalid={!!fieldState.error}>
                            <FieldLabel>支付宝公钥证书</FieldLabel>
                            <Textarea
                              {...field}
                              placeholder="请输入支付宝公钥证书内容"
                              className="font-mono text-sm"
                              aria-invalid={!!fieldState.error}
                            />
                            <FieldDescription>
                              支付宝公钥证书内容(alipayCertPublicKey)
                            </FieldDescription>
                            {fieldState.error && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                      <Controller
                        name="alipayConfig.alipayRootCert"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field className="gap-2" data-invalid={!!fieldState.error}>
                            <FieldLabel>支付宝根证书</FieldLabel>
                            <Textarea
                              {...field}
                              placeholder="请输入支付宝根证书内容"
                              className="font-mono text-sm"
                              aria-invalid={!!fieldState.error}
                            />
                            <FieldDescription>支付宝根证书内容(alipayRootCert)</FieldDescription>
                            {fieldState.error && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                    </div>
                  )}
                </FieldGroup>
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
              >
                取消
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
