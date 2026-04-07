import type { LoginType } from "@buildingai/constants";
import { LOGIN_TYPE } from "@buildingai/constants/shared/auth";
import { useI18n } from "@buildingai/i18n";
import { useLoginSettingsQuery, useSetLoginSettingsMutation } from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { Button } from "@buildingai/ui/components/ui/button";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@buildingai/ui/components/ui/field";
import { Label } from "@buildingai/ui/components/ui/label";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

const LOGIN_TYPE_OPTIONS: { value: LoginType; labelKey: string }[] = [
  { value: LOGIN_TYPE.ACCOUNT as LoginType, labelKey: "system.loginConfig.registerMethod.account" },
  { value: LOGIN_TYPE.WECHAT as LoginType, labelKey: "system.loginConfig.registerMethod.wechat" },
  { value: LOGIN_TYPE.PHONE as LoginType, labelKey: "system.loginConfig.registerMethod.phone" },
  { value: LOGIN_TYPE.GOOGLE as LoginType, labelKey: "system.loginConfig.registerMethod.google" },
];

const defaultConfig = {
  allowedLoginMethods: [LOGIN_TYPE.ACCOUNT, LOGIN_TYPE.WECHAT] as LoginType[],
  allowedRegisterMethods: [LOGIN_TYPE.ACCOUNT, LOGIN_TYPE.WECHAT] as LoginType[],
  allowMultipleLogin: true,
  showPolicyAgreement: true,
};

const SystemLoginConfigIndexPage = () => {
  const { t } = useI18n();
  const { data, isLoading } = useLoginSettingsQuery();
  const setMutation = useSetLoginSettingsMutation({
    onSuccess: () => {
      toast.success(t("system.loginConfig.saveSuccess"));
    },
    onError: (e) => {
      toast.error(t("system.loginConfig.saveFailed", { message: e.message }));
    },
  });

  const [allowedLoginMethods, setAllowedLoginMethods] = useState<LoginType[]>(
    defaultConfig.allowedLoginMethods,
  );
  const [allowedRegisterMethods, setAllowedRegisterMethods] = useState<LoginType[]>(
    defaultConfig.allowedRegisterMethods,
  );
  const [allowMultipleLogin, setAllowMultipleLogin] = useState(defaultConfig.allowMultipleLogin);
  const [showPolicyAgreement, setShowPolicyAgreement] = useState(defaultConfig.showPolicyAgreement);

  const initialData = useMemo(
    () =>
      data
        ? {
            allowedLoginMethods: data.allowedLoginMethods,
            allowedRegisterMethods: data.allowedRegisterMethods,
            allowMultipleLogin: data.allowMultipleLogin,
            showPolicyAgreement: data.showPolicyAgreement,
          }
        : null,
    [data],
  );

  useEffect(() => {
    if (!initialData) return;
    setAllowedLoginMethods(initialData.allowedLoginMethods);
    setAllowedRegisterMethods(initialData.allowedRegisterMethods);
    setAllowMultipleLogin(initialData.allowMultipleLogin);
    setShowPolicyAgreement(initialData.showPolicyAgreement);
  }, [initialData]);

  const toggleLogin = (value: LoginType) => {
    setAllowedLoginMethods((prev) => {
      const next = prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
      if (next.length === 0) return prev;
      return next;
    });
  };

  const toggleRegister = (value: LoginType) => {
    setAllowedRegisterMethods((prev) => {
      const next = prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
      return next;
    });
  };

  const handleSave = () => {
    if (allowedLoginMethods.length === 0) {
      toast.error(t("system.loginConfig.atLeastOneMethod"));
      return;
    }
    setMutation.mutate({
      allowedLoginMethods,
      allowedRegisterMethods,
      allowMultipleLogin,
      showPolicyAgreement,
    });
  };

  const handleReset = () => {
    if (!initialData) return;
    setAllowedLoginMethods(initialData.allowedLoginMethods);
    setAllowedRegisterMethods(initialData.allowedRegisterMethods);
    setAllowMultipleLogin(initialData.allowMultipleLogin);
    setShowPolicyAgreement(initialData.showPolicyAgreement);
    toast.success(t("system.loginConfig.resetSuccess"));
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
      <PermissionGuard permissions="users:get-login-settings">
        <div className="space-y-6 px-3">
          <h1 className="text-2xl font-semibold">{t("system.loginConfig.title")}</h1>

          <FieldGroup>
            <FieldLabel>{t("system.loginConfig.registerMethod.label")}</FieldLabel>
            <div className="flex flex-wrap gap-6">
              {LOGIN_TYPE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`register-${opt.value}`}
                    checked={allowedRegisterMethods.includes(opt.value)}
                    onCheckedChange={() => toggleRegister(opt.value)}
                  />
                  <Label htmlFor={`register-${opt.value}`} className="cursor-pointer font-normal">
                    {t(opt.labelKey)}
                  </Label>
                </div>
              ))}
            </div>
            <FieldDescription>
              {t("system.loginConfig.registerMethod.description")}
            </FieldDescription>
          </FieldGroup>

          <FieldGroup>
            <FieldLabel>
              <span className="text-destructive">*</span>{" "}
              {t("system.loginConfig.loginMethod.label")}
            </FieldLabel>
            <div className="flex flex-wrap gap-6">
              {LOGIN_TYPE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`login-${opt.value}`}
                    checked={allowedLoginMethods.includes(opt.value)}
                    onCheckedChange={() => toggleLogin(opt.value)}
                  />
                  <Label htmlFor={`login-${opt.value}`} className="cursor-pointer font-normal">
                    {t(opt.labelKey.replace("registerMethod", "loginMethod"))}
                  </Label>
                </div>
              ))}
            </div>
            <FieldDescription>{t("system.loginConfig.loginMethod.required")}</FieldDescription>
          </FieldGroup>

          <FieldGroup>
            <Field>
              <div className="flex max-w-sm items-center justify-between gap-4">
                <div>
                  <FieldLabel>{t("system.loginConfig.multiLogin.label")}</FieldLabel>
                  <FieldDescription>
                    {t("system.loginConfig.multiLogin.description")}
                  </FieldDescription>
                </div>
                <Switch checked={allowMultipleLogin} onCheckedChange={setAllowMultipleLogin} />
              </div>
            </Field>
            <Field>
              <div className="flex max-w-sm items-center justify-between gap-4">
                <div>
                  <FieldLabel>{t("system.loginConfig.policy.label")}</FieldLabel>
                  <FieldDescription>{t("system.loginConfig.policy.description")}</FieldDescription>
                </div>
                <Switch checked={showPolicyAgreement} onCheckedChange={setShowPolicyAgreement} />
              </div>
            </Field>
            <FieldDescription>
              {t("system.loginConfig.channelLinks.wechatConfig")}{" "}
              <Link to="/console/channel/wechat-oa" className="text-primary">
                {t("system.loginConfig.channelLinks.wechatConfig")}
              </Link>{" "}
              {t("system.loginConfig.channelLinks.googleConfig")}{" "}
              <Link to="/console/channel/google" className="text-primary">
                {t("system.loginConfig.channelLinks.googleConfig")}
              </Link>
            </FieldDescription>
          </FieldGroup>

          <div className="flex gap-3">
            <PermissionGuard permissions="users:set-login-settings">
              <Button onClick={handleSave} disabled={setMutation.isPending}>
                {setMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("system.loginConfig.save")}
              </Button>

              <Button variant="outline" onClick={handleReset} disabled={!initialData}>
                {t("system.loginConfig.reset")}
              </Button>
            </PermissionGuard>
          </div>
        </div>
      </PermissionGuard>
    </PageContainer>
  );
};

export default SystemLoginConfigIndexPage;
