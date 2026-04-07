import { useI18n } from "@buildingai/i18n";
import {
  type GoogleConfigResponse,
  useGoogleConfigQuery,
  useUpdateGoogleConfigMutation,
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
  const { t } = useI18n();
  const { data, isLoading } = useGoogleConfigQuery();
  const config = data as GoogleConfigResponse | undefined;
  const updateMutation = useUpdateGoogleConfigMutation({
    onSuccess: () => toast.success(t("channel.google.saveSuccess")),
    onError: (e) => toast.error(t("channel.google.saveFailed", { message: e.message })),
  });

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [enabled, setEnabled] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(t("channel.google.copied")));
  };

  useEffect(() => {
    if (!config) return;
    setClientId(config.clientId ?? "");
    setClientSecret(config.clientSecret ?? "");
    setEnabled(config.enabled ?? false);
  }, [config]);

  const handleSave = () => {
    if (!clientId.trim()) {
      toast.error(t("channel.google.clientId.required"));
      return;
    }
    if (!clientSecret.trim()) {
      toast.error(t("channel.google.clientSecret.required"));
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
          <h1 className="text-2xl font-semibold">{t("channel.google.title")}</h1>
          <PermissionGuard permissions="google-config:update-config">
            <Button onClick={handleSave} loading={updateMutation.isPending} disabled={isLoading}>
              {t("channel.google.saveConfig")}
            </Button>
          </PermissionGuard>
        </div>

        <Alert>
          <ShieldCheck className="size-4" />
          <AlertTitle className="gap-2 sm:flex sm:items-center">
            <div>{t("channel.google.alert.title")}</div>
            <div>
              <Link
                to="https://console.cloud.google.com/"
                target="_blank"
                className="text-primary inline-flex items-center gap-1"
              >
                {t("channel.google.alert.linkText")}
                <ShieldCheck className="size-3" />
              </Link>
            </div>
          </AlertTitle>
        </Alert>

        <FieldGroup>
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-5">
            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle>{t("channel.google.oauthConfig.title")}</CardTitle>
                <CardDescription>{t("channel.google.oauthConfig.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field>
                  <FieldLabel>{t("channel.google.callbackUrl.label")}</FieldLabel>
                  <FieldDescription>{t("channel.google.callbackUrl.description")}</FieldDescription>
                  <InputGroup data-disabled="true" className="max-w-md">
                    <InputGroupInput value={GOOGLE_CALLBACK_URL} readOnly disabled placeholder="" />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-sm"
                        aria-label={t("channel.google.callbackUrl.copyButton")}
                        onClick={() => copyToClipboard(GOOGLE_CALLBACK_URL)}
                      >
                        <Copy className="size-4" />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
                <Field>
                  <FieldLabel>
                    <span className="text-destructive">*</span> {t("channel.google.clientId.label")}
                  </FieldLabel>
                  <Input
                    value={clientId}
                    className="max-w-xs"
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder={t("channel.google.clientId.placeholder")}
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel>
                    <span className="text-destructive">*</span>{" "}
                    {t("channel.google.clientSecret.label")}
                  </FieldLabel>
                  <Input
                    value={clientSecret}
                    type="password"
                    className="max-w-xs"
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder={t("channel.google.clientSecret.placeholder")}
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
