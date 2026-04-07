import { useI18n } from "@buildingai/i18n";
import {
  type UpdateWxOaConfigDto,
  useUpdateWxOaConfigMutation,
  useWxOaConfigQuery,
  type WxOaConfigResponse,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { Alert, AlertTitle } from "@buildingai/ui/components/ui/alert";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@buildingai/ui/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@buildingai/ui/components/ui/field";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@buildingai/ui/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

const WechatOAIndexPage = () => {
  const { t } = useI18n();
  const { data, isLoading } = useWxOaConfigQuery();
  const config = data as WxOaConfigResponse | undefined;
  const updateMutation = useUpdateWxOaConfigMutation({
    onSuccess: () => toast.success(t("channel.wechatOA.toast.saveSuccess")),
    onError: (e) => toast.error(t("channel.wechatOA.toast.saveFailed", { message: e.message })),
  });

  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [token, setToken] = useState("");
  const [encodingAESKey, setEncodingAESKey] = useState("");
  const [messageEncryptType, setMessageEncryptType] =
    useState<UpdateWxOaConfigDto["messageEncryptType"]>("plain");

  const MESSAGE_ENCRYPT_OPTIONS: {
    value: UpdateWxOaConfigDto["messageEncryptType"];
    label: string;
  }[] = [
    { value: "plain", label: t("channel.wechatOA.messageEncrypt.plain") },
    { value: "compatible", label: t("channel.wechatOA.messageEncrypt.compatible") },
    { value: "safe", label: t("channel.wechatOA.messageEncrypt.safe") },
  ];

  useEffect(() => {
    if (!config) return;
    setAppId(config.appId ?? "");
    setAppSecret(config.appSecret ?? "");
    setToken(config.token ?? "");
    setEncodingAESKey(config.encodingAESKey ?? "");
    setMessageEncryptType(
      (config.messageEncryptType as UpdateWxOaConfigDto["messageEncryptType"]) ?? "plain",
    );
  }, [config]);

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("channel.wechatOA.toast.copied"));
    } catch {
      toast.error(t("channel.wechatOA.toast.copyFailed"));
    }
  };

  const stripProtocol = (url: string) => url.replace(/^https?:\/\//i, "").trim() || url;

  const handleSave = () => {
    if (!appId.trim()) {
      toast.error(t("channel.wechatOA.validation.appIdRequired"));
      return;
    }
    if (!appSecret.trim()) {
      toast.error(t("channel.wechatOA.validation.appSecretRequired"));
      return;
    }
    updateMutation.mutate({
      appId: appId.trim(),
      appSecret: appSecret.trim(),
      token: token.trim(),
      encodingAESKey: encodingAESKey.trim(),
      messageEncryptType,
    });
  };

  return (
    <PageContainer>
      <div className="space-y-6 px-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{t("channel.wechatOA.title")}</h1>
          <PermissionGuard permissions="wxoaconfig:update-config">
            <Button onClick={handleSave} loading={updateMutation.isPending} disabled={isLoading}>
              {t("channel.wechatOA.saveConfig")}
            </Button>
          </PermissionGuard>
        </div>

        <Alert>
          <ShieldCheck className="size-4" />
          <AlertTitle className="gap-2 sm:flex sm:items-center">
            <div>{t("channel.wechatOA.alert.title")}</div>
            <div>
              <Link
                to="https://mp.weixin.qq.com/"
                target="_blank"
                className="text-primary inline-flex items-center gap-1"
              >
                {t("channel.wechatOA.alert.linkText")}
                <ExternalLink className="size-3" />
              </Link>
            </div>
          </AlertTitle>
        </Alert>

        <FieldGroup>
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-5">
            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle>{t("channel.wechatOA.developerInfo.title")}</CardTitle>
                <CardDescription>{t("channel.wechatOA.developerInfo.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field>
                  <FieldLabel>
                    <span className="text-destructive">*</span>{" "}
                    {t("channel.wechatOA.developerInfo.appId")}
                  </FieldLabel>
                  <Input
                    value={appId}
                    className="max-w-xs"
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder={t("channel.wechatOA.developerInfo.appIdPlaceholder")}
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel>
                    <span className="text-destructive">*</span>{" "}
                    {t("channel.wechatOA.developerInfo.appSecret")}
                  </FieldLabel>
                  <Input
                    value={appSecret}
                    type="password"
                    className="max-w-xs"
                    onChange={(e) => setAppSecret(e.target.value)}
                    placeholder={t("channel.wechatOA.developerInfo.appSecretPlaceholder")}
                    disabled={isLoading}
                  />
                </Field>
              </CardContent>
            </Card>
            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle>{t("channel.wechatOA.serverConfig.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field>
                  <FieldLabel>{t("channel.wechatOA.serverConfig.url")}</FieldLabel>
                  <FieldDescription>
                    {t("channel.wechatOA.serverConfig.urlDescription")}
                  </FieldDescription>
                  <InputGroup data-disabled="true" className="max-w-xs">
                    <InputGroupInput
                      value={config?.url ?? ""}
                      readOnly
                      disabled
                      placeholder={t("channel.wechatOA.serverConfig.urlPlaceholder")}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-sm"
                        aria-label={t("channel.wechatOA.serverConfig.copyUrl")}
                        onClick={() => copyToClipboard(config?.url ?? "")}
                      >
                        <Copy className="size-4" />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
                <Field>
                  <FieldLabel>{t("channel.wechatOA.serverConfig.token")}</FieldLabel>
                  <FieldDescription>
                    {t("channel.wechatOA.serverConfig.tokenDescription")}
                  </FieldDescription>
                  <Input
                    value={token}
                    className="max-w-xs"
                    onChange={(e) => setToken(e.target.value)}
                    placeholder={t("channel.wechatOA.serverConfig.tokenPlaceholder")}
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("channel.wechatOA.serverConfig.encodingAESKey")}</FieldLabel>
                  <FieldDescription>
                    {t("channel.wechatOA.serverConfig.encodingAESKeyDescription")}
                  </FieldDescription>
                  <Input
                    value={encodingAESKey}
                    className="max-w-xs"
                    onChange={(e) => setEncodingAESKey(e.target.value)}
                    placeholder={t("channel.wechatOA.serverConfig.encodingAESKeyPlaceholder")}
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("channel.wechatOA.serverConfig.messageEncryptType")}</FieldLabel>
                  <Select
                    value={messageEncryptType}
                    onValueChange={(v) =>
                      setMessageEncryptType(v as UpdateWxOaConfigDto["messageEncryptType"])
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESSAGE_ENCRYPT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </CardContent>
            </Card>
            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle>{t("channel.wechatOA.featureSettings.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field>
                  <FieldLabel>{t("channel.wechatOA.featureSettings.businessDomain")}</FieldLabel>
                  <InputGroup data-disabled="true" className="max-w-xs">
                    <InputGroupInput
                      value={stripProtocol(config?.domain ?? "")}
                      readOnly
                      disabled
                      placeholder={t("channel.wechatOA.featureSettings.businessDomainPlaceholder")}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-sm"
                        aria-label={t("channel.wechatOA.featureSettings.copyBusinessDomain")}
                        onClick={() => copyToClipboard(stripProtocol(config?.domain ?? ""))}
                      >
                        <Copy className="size-4" />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>
                    {t("channel.wechatOA.featureSettings.businessDomainDescription")}
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>{t("channel.wechatOA.featureSettings.jsApiDomain")}</FieldLabel>
                  <InputGroup data-disabled="true" className="max-w-xs">
                    <InputGroupInput
                      value={stripProtocol(config?.jsApiDomain ?? "")}
                      readOnly
                      disabled
                      placeholder={t("channel.wechatOA.featureSettings.jsApiDomainPlaceholder")}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-sm"
                        aria-label={t("channel.wechatOA.featureSettings.copyJsApiDomain")}
                        onClick={() => copyToClipboard(stripProtocol(config?.jsApiDomain ?? ""))}
                      >
                        <Copy className="size-4" />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>
                    {t("channel.wechatOA.featureSettings.jsApiDomainDescription")}
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>{t("channel.wechatOA.featureSettings.webAuthDomain")}</FieldLabel>
                  <InputGroup data-disabled="true" className="max-w-xs">
                    <InputGroupInput
                      value={stripProtocol(config?.webAuthDomain ?? "")}
                      readOnly
                      disabled
                      placeholder={t("channel.wechatOA.featureSettings.webAuthDomainPlaceholder")}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-sm"
                        aria-label={t("channel.wechatOA.featureSettings.copyWebAuthDomain")}
                        onClick={() => copyToClipboard(stripProtocol(config?.webAuthDomain ?? ""))}
                      >
                        <Copy className="size-4" />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>
                    {t("channel.wechatOA.featureSettings.webAuthDomainDescription")}
                  </FieldDescription>
                </Field>
              </CardContent>
            </Card>
          </div>
        </FieldGroup>
      </div>
    </PageContainer>
  );
};

export default WechatOAIndexPage;
