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

const MESSAGE_ENCRYPT_OPTIONS: {
  value: UpdateWxOaConfigDto["messageEncryptType"];
  label: string;
}[] = [
  { value: "plain", label: "明文模式" },
  { value: "compatible", label: "兼容模式" },
  { value: "safe", label: "安全模式" },
];

const WechatOAIndexPage = () => {
  const { data, isLoading } = useWxOaConfigQuery();
  const config = data as WxOaConfigResponse | undefined;
  const updateMutation = useUpdateWxOaConfigMutation({
    onSuccess: () => toast.success("保存成功"),
    onError: (e) => toast.error(`保存失败: ${e.message}`),
  });

  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [token, setToken] = useState("");
  const [encodingAESKey, setEncodingAESKey] = useState("");
  const [messageEncryptType, setMessageEncryptType] =
    useState<UpdateWxOaConfigDto["messageEncryptType"]>("plain");

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
      toast.success("已复制");
    } catch {
      toast.error("复制失败");
    }
  };

  const stripProtocol = (url: string) => url.replace(/^https?:\/\//i, "").trim() || url;

  const handleSave = () => {
    if (!appId.trim()) {
      toast.error("请填写 AppID");
      return;
    }
    if (!appSecret.trim()) {
      toast.error("请填写 AppSecret");
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
          <h1 className="text-2xl font-semibold">微信公众号配置</h1>
          <PermissionGuard permissions="wxoaconfig:update-config">
            <Button onClick={handleSave} loading={updateMutation.isPending} disabled={isLoading}>
              保存配置
            </Button>
          </PermissionGuard>
        </div>

        <Alert>
          <ShieldCheck className="size-4" />
          <AlertTitle className="gap-2 sm:flex sm:items-center">
            <div>请先前往微信公众号后台申请认证微信公众号-服务号</div>
            <div>
              <Link
                to="https://mp.weixin.qq.com/"
                target="_blank"
                className="text-primary inline-flex items-center gap-1"
              >
                前往微信公众号后台
                <ExternalLink className="size-3" />
              </Link>
            </div>
          </AlertTitle>
        </Alert>

        <FieldGroup>
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-5">
            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle>公众号开发者信息</CardTitle>
                <CardDescription>
                  登录微信公众平台，点击开发&gt;基本配置&gt;公众号开发信息，设置AppID和AppSecret
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field>
                  <FieldLabel>
                    <span className="text-destructive">*</span> AppID
                  </FieldLabel>
                  <Input
                    value={appId}
                    className="max-w-xs"
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="粘贴微信公众号 AppID"
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel>
                    <span className="text-destructive">*</span> AppSecret
                  </FieldLabel>
                  <Input
                    value={appSecret}
                    type="password"
                    className="max-w-xs"
                    onChange={(e) => setAppSecret(e.target.value)}
                    placeholder="粘贴微信公众号 AppSecret"
                    disabled={isLoading}
                  />
                </Field>
              </CardContent>
            </Card>
            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle>服务器配置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field>
                  <FieldLabel>URL</FieldLabel>
                  <FieldDescription>
                    登录微信公众平台，点击开发&gt;基本配置&gt;服务器配置，填写上述服务器地址（URL）
                  </FieldDescription>
                  <InputGroup data-disabled="true" className="max-w-xs">
                    <InputGroupInput
                      value={config?.url ?? ""}
                      readOnly
                      disabled
                      placeholder="由系统根据 APP_DOMAIN 生成"
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-sm"
                        aria-label="复制 URL"
                        onClick={() => copyToClipboard(config?.url ?? "")}
                      >
                        <Copy className="size-4" />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
                <Field>
                  <FieldLabel>Token</FieldLabel>
                  <FieldDescription>
                    登录微信公众平台，点击开发&gt;基本配置&gt;服务器配置，设置令牌 Token
                  </FieldDescription>
                  <Input
                    value={token}
                    className="max-w-xs"
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="服务器配置令牌 Token"
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel>EncodingAESKey</FieldLabel>
                  <FieldDescription>
                    消息加密密钥由43位字符组成，字符范围为 A-Z, a-z, 0-9
                  </FieldDescription>
                  <Input
                    value={encodingAESKey}
                    className="max-w-xs"
                    onChange={(e) => setEncodingAESKey(e.target.value)}
                    placeholder="43位字符，范围 A-Z, a-z, 0-9"
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel>消息加密方式</FieldLabel>
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
                <CardTitle>功能设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field>
                  <FieldLabel>业务域名</FieldLabel>
                  <InputGroup data-disabled="true" className="max-w-xs">
                    <InputGroupInput
                      value={stripProtocol(config?.domain ?? "")}
                      readOnly
                      disabled
                      placeholder="由系统根据 APP_DOMAIN 生成"
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-sm"
                        aria-label="复制业务域名"
                        onClick={() => copyToClipboard(stripProtocol(config?.domain ?? ""))}
                      >
                        <Copy className="size-4" />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>
                    登录微信公众平台，点击设置&gt;公众号设置&gt;功能设置，填写业务域名
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>JS接口安全域名</FieldLabel>
                  <InputGroup data-disabled="true" className="max-w-xs">
                    <InputGroupInput
                      value={stripProtocol(config?.jsApiDomain ?? "")}
                      readOnly
                      disabled
                      placeholder="由系统根据 APP_DOMAIN 生成"
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-sm"
                        aria-label="复制 JS 接口安全域名"
                        onClick={() => copyToClipboard(stripProtocol(config?.jsApiDomain ?? ""))}
                      >
                        <Copy className="size-4" />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>
                    登录微信公众平台，点击设置&gt;公众号设置&gt;功能设置，填写JS接口安全域名
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>网页授权域名</FieldLabel>
                  <InputGroup data-disabled="true" className="max-w-xs">
                    <InputGroupInput
                      value={stripProtocol(config?.webAuthDomain ?? "")}
                      readOnly
                      disabled
                      placeholder="由系统根据 APP_DOMAIN 生成"
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-sm"
                        aria-label="复制网页授权域名"
                        onClick={() => copyToClipboard(stripProtocol(config?.webAuthDomain ?? ""))}
                      >
                        <Copy className="size-4" />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>
                    登录微信公众平台，点击设置&gt;公众号设置&gt;功能设置，填写网页授权域名
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
