import {
  useUpdateGoogleConfigMutation,
  useGoogleConfigQuery,
  type GoogleConfigResponse,
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
import { Copy, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

const GOOGLE_CALLBACK_URL = `${window.location.origin}/api/auth/google-callback`;

const GoogleIndexPage = () => {
  const { data, isLoading } = useGoogleConfigQuery();
  const config = data as GoogleConfigResponse | undefined;
  const updateMutation = useUpdateGoogleConfigMutation({
    onSuccess: () => toast.success("保存成功"),
    onError: (e) => toast.error(`保存失败: ${e.message}`),
  });

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [enabled, setEnabled] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("已复制"));
  };

  useEffect(() => {
    if (!config) return;
    setClientId(config.clientId ?? "");
    setClientSecret(config.clientSecret ?? "");
    setEnabled(config.enabled ?? false);
  }, [config]);

  const handleSave = () => {
    if (!clientId.trim()) {
      toast.error("请填写 Client ID");
      return;
    }
    if (!clientSecret.trim()) {
      toast.error("请填写 Client Secret");
      return;
    }
    updateMutation.mutate({
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      enabled,
    });
  };

  return (
    <PageContainer>
      <div className="space-y-6 px-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Google登录配置</h1>
          <PermissionGuard permissions="google-config:update-config">
            <Button onClick={handleSave} loading={updateMutation.isPending} disabled={isLoading}>
              保存配置
            </Button>
          </PermissionGuard>
        </div>

        <Alert>
          <ShieldCheck className="size-4" />
          <AlertTitle className="gap-2 sm:flex sm:items-center">
            <div>请先前往 Google Cloud Console 申请 OAuth 2.0 客户端ID</div>
            <div>
              <Link
                to="https://console.cloud.google.com/"
                target="_blank"
                className="text-primary inline-flex items-center gap-1"
              >
                前往 Google Cloud Console
                <ShieldCheck className="size-3" />
              </Link>
            </div>
          </AlertTitle>
        </Alert>

        <FieldGroup>
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-5">
            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle>Google OAuth 配置</CardTitle>
                <CardDescription>
                  登录 Google Cloud Console，点击 APIs &amp; Services &gt; Credentials，创建 OAuth 2.0 Client ID
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field>
                  <FieldLabel>回调地址</FieldLabel>
                  <FieldDescription>
                    登录 Google Cloud Console，在 OAuth 2.0 Client ID 的已授权重定向 URI 中添加以下地址
                  </FieldDescription>
                  <InputGroup data-disabled="true" className="max-w-md">
                    <InputGroupInput
                      value={GOOGLE_CALLBACK_URL}
                      readOnly
                      disabled
                      placeholder=""
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-sm"
                        aria-label="复制回调地址"
                        onClick={() => copyToClipboard(GOOGLE_CALLBACK_URL)}
                      >
                        <Copy className="size-4" />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
                <Field>
                  <FieldLabel>
                    <span className="text-destructive">*</span> Client ID
                  </FieldLabel>
                  <Input
                    value={clientId}
                    className="max-w-xs"
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="粘贴 Google Client ID"
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel>
                    <span className="text-destructive">*</span> Client Secret
                  </FieldLabel>
                  <Input
                    value={clientSecret}
                    type="password"
                    className="max-w-xs"
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="粘贴 Google Client Secret"
                    disabled={isLoading}
                  />
                </Field>
              </CardContent>
            </Card>
          </div>
        </FieldGroup>
      </div>
    </PageContainer>
  );
};

export default GoogleIndexPage;
