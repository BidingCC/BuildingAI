import { useGoogleOaConfigQuery, useSetGoogleOaConfigMutation } from "@buildingai/services/console";
import { Alert, AlertDescription, AlertTitle } from "@buildingai/ui/components/ui/alert";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  InputGroupText,
} from "@buildingai/ui/components/ui/input-group";
import { Separator } from "@buildingai/ui/components/ui/separator";
import { StatusBadge } from "@buildingai/ui/components/ui/status-badge";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { Copy, ExternalLink, KeyRound, Loader2, Settings2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

function CopyField({
  label,
  value,
  description,
  addonLabel,
  copyAriaLabel,
  onCopy,
}: {
  label: string;
  value: string;
  description: string;
  addonLabel: string;
  copyAriaLabel: string;
  onCopy: (v: string) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <InputGroup data-disabled="true">
        <InputGroupAddon>
          <InputGroupText>{addonLabel}</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput value={value} disabled />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-sm" aria-label={copyAriaLabel} onClick={() => onCopy(value)}>
            <Copy className="size-4" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <FieldDescription>{description}</FieldDescription>
    </Field>
  );
}

const ChannelGoogleOaIndexPage = () => {
  const { data, isLoading } = useGoogleOaConfigQuery();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [updateClientSecret, setUpdateClientSecret] = useState(false);

  const setMutation = useSetGoogleOaConfigMutation({
    onSuccess: () => toast.success("保存成功"),
    onError: (e) => toast.error(`保存失败: ${e.message}`),
  });

  useEffect(() => {
    if (!data) return;
    setClientId(data.clientId ?? "");
    setClientSecret("");
    setUpdateClientSecret(!data.clientSecretConfigured);
  }, [data]);

  const jsOrigins = typeof window === "undefined" ? "" : window.location.origin;
  const isConfigured = !!clientId.trim() && !!data?.clientSecretConfigured;

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("已复制");
    } catch {
      toast.error("复制失败");
    }
  };

  const handleSave = () => {
    if (!clientId.trim()) {
      toast.error("请填写 Client ID");
      return;
    }
    const needSecret = !data?.clientSecretConfigured || updateClientSecret;
    if (needSecret && !clientSecret.trim()) {
      toast.error("请填写 Client Secret");
      return;
    }
    setMutation.mutate({
      clientId: clientId.trim(),
      ...(needSecret ? { clientSecret: clientSecret.trim() } : {}),
    });
  };

  const handleReset = () => {
    setClientId(data?.clientId ?? "");
    setClientSecret("");
    setUpdateClientSecret(!data?.clientSecretConfigured);
    toast.success("已重置为当前保存的配置");
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center py-12">
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6 px-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">谷歌登录配置</h1>
          <StatusBadge
            active={isConfigured}
            activeText="已配置"
            inactiveText="未完成"
            activeVariant="success"
            inactiveVariant={clientId.trim() ? "muted" : "destructive"}
          />
          <Badge variant="outline" className="text-muted-foreground border-dashed">
            OAuth 2.0
          </Badge>
        </div>

        <Alert>
          <ShieldCheck className="size-4" />
          <AlertTitle className="flex items-center gap-2">
            启用谷歌登录
            <Link
              to="/console/system/login-config"
              className="text-primary inline-flex items-center gap-1"
            >
              前往登录设置
              <ExternalLink className="size-3" />
            </Link>
          </AlertTitle>
          <AlertDescription>
            这里配置的是「凭证」。完成后还需要在登录设置中勾选“谷歌登录”，用户才会看到入口。
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="config">
          <TabsList>
            <TabsTrigger value="config" className="gap-2">
              <Settings2 className="size-4" />
              配置
            </TabsTrigger>
            <TabsTrigger value="guide" className="gap-2">
              <KeyRound className="size-4" />
              接入指南
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>凭证</CardTitle>
                  <CardDescription>建议使用 Web 应用类型的 OAuth 2.0 客户端</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FieldGroup>
                    <Field>
                      <FieldLabel>
                        <span className="text-destructive">*</span> Client ID
                      </FieldLabel>
                      <Textarea
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="粘贴 Google OAuth 2.0 Client ID"
                      />
                      <FieldDescription>通常以 apps.googleusercontent.com 结尾</FieldDescription>
                    </Field>

                    <Separator />

                    <Field>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <FieldLabel>
                            <span className="text-destructive">*</span> Client Secret
                          </FieldLabel>
                          <FieldDescription>
                            {data?.clientSecretConfigured
                              ? "已配置密钥，默认不修改。如需更新请开启开关并填写新密钥。"
                              : "首次保存需要填写密钥。"}
                          </FieldDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">更新密钥</span>
                          <Switch
                            checked={updateClientSecret}
                            onCheckedChange={(v) => {
                              setUpdateClientSecret(v);
                              if (!v) setClientSecret("");
                            }}
                            disabled={!data?.clientSecretConfigured}
                          />
                        </div>
                      </div>
                      <Input
                        type="password"
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        placeholder={
                          data?.clientSecretConfigured
                            ? "开启“更新密钥”后填写"
                            : "粘贴 Google OAuth 2.0 Client Secret"
                        }
                        disabled={data?.clientSecretConfigured ? !updateClientSecret : false}
                      />
                    </Field>
                  </FieldGroup>
                </CardContent>
                <CardFooter className="border-t">
                  <div className="flex w-full flex-wrap items-center justify-between gap-3">
                    <div className="text-muted-foreground text-xs">
                      密钥仅在更新时提交，留空不会覆盖已有配置
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        disabled={!data || setMutation.isPending}
                      >
                        重置
                      </Button>
                      <Button onClick={handleSave} disabled={setMutation.isPending}>
                        {setMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                        保存配置
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>回调与域名</CardTitle>
                  <CardDescription>
                    将下面信息填入 Google Cloud Console 的 OAuth 客户端配置
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FieldGroup>
                    <CopyField
                      label="授权重定向 URI"
                      value={data?.redirectUri ?? ""}
                      description="Google 登录完成后会跳转回该地址"
                      addonLabel="回调"
                      copyAriaLabel="复制回调地址"
                      onCopy={copy}
                    />
                    <CopyField
                      label="授权 JavaScript 来源"
                      value={jsOrigins}
                      description="通常填写站点域名即可"
                      addonLabel="域名"
                      copyAriaLabel="复制域名"
                      onCopy={copy}
                    />
                  </FieldGroup>
                </CardContent>
                <CardFooter className="border-t">
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary inline-flex items-center gap-1 text-sm"
                  >
                    打开 Google Cloud Console
                    <ExternalLink className="size-4" />
                  </a>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="guide">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>1. 创建 OAuth 客户端</CardTitle>
                  <CardDescription>在 Google Cloud Console 创建 OAuth 2.0 凭证</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-2 text-sm">
                  <div>选择应用类型为 Web 应用</div>
                  <div>填写应用名称与支持邮箱</div>
                  <div>创建后复制 Client ID 与 Client Secret</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>2. 配置域名与回调</CardTitle>
                  <CardDescription>把配置页右侧的值粘贴到客户端设置中</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-2 text-sm">
                  <div>授权 JavaScript 来源：填写你的站点域名</div>
                  <div>授权重定向 URI：填写回调地址</div>
                  <div>保存后等待配置生效</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>3. 启用登录入口</CardTitle>
                  <CardDescription>回到登录设置开启谷歌登录</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-2 text-sm">
                  <div>前往「系统 - 登录设置」勾选谷歌登录</div>
                  <div>选择默认登录方式（可选）</div>
                  <div>在前台登录页验证是否可用</div>
                </CardContent>
                <CardFooter className="border-t">
                  <Link
                    to="/console/system/login-config"
                    className="text-primary inline-flex items-center gap-1 text-sm"
                  >
                    去登录设置
                    <ExternalLink className="size-4" />
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
};

export default ChannelGoogleOaIndexPage;
