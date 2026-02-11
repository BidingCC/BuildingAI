import type { LoginType } from "@buildingai/constants";
import { LOGIN_TYPE } from "@buildingai/constants/shared/auth";
import { useLoginSettingsQuery, useSetLoginSettingsMutation } from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@buildingai/ui/components/ui/field";
import { Label } from "@buildingai/ui/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@buildingai/ui/components/ui/radio-group";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

const LOGIN_TYPE_OPTIONS: { value: LoginType; label: string }[] = [
  { value: LOGIN_TYPE.ACCOUNT as LoginType, label: "账号" },
  { value: LOGIN_TYPE.WECHAT as LoginType, label: "微信" },
  { value: LOGIN_TYPE.PHONE as LoginType, label: "手机号" },
  { value: LOGIN_TYPE.GOOGLE as LoginType, label: "谷歌" },
];

const defaultConfig = {
  allowedLoginMethods: [LOGIN_TYPE.ACCOUNT, LOGIN_TYPE.WECHAT] as LoginType[],
  allowedRegisterMethods: [LOGIN_TYPE.ACCOUNT, LOGIN_TYPE.WECHAT] as LoginType[],
  defaultLoginMethod: LOGIN_TYPE.ACCOUNT as LoginType,
  allowMultipleLogin: false,
  showPolicyAgreement: true,
};

const SystemLoginConfigIndexPage = () => {
  const { data, isLoading } = useLoginSettingsQuery();
  const setMutation = useSetLoginSettingsMutation({
    onSuccess: () => {
      toast.success("保存成功");
    },
    onError: (e) => {
      toast.error(`保存失败: ${e.message}`);
    },
  });

  const [allowedLoginMethods, setAllowedLoginMethods] = useState<LoginType[]>(
    defaultConfig.allowedLoginMethods,
  );
  const [allowedRegisterMethods, setAllowedRegisterMethods] = useState<LoginType[]>(
    defaultConfig.allowedRegisterMethods,
  );
  const [defaultLoginMethod, setDefaultLoginMethod] = useState<LoginType>(
    defaultConfig.defaultLoginMethod,
  );
  const [allowMultipleLogin, setAllowMultipleLogin] = useState(defaultConfig.allowMultipleLogin);
  const [showPolicyAgreement, setShowPolicyAgreement] = useState(defaultConfig.showPolicyAgreement);

  const initialData = useMemo(
    () =>
      data
        ? {
            allowedLoginMethods: data.allowedLoginMethods,
            allowedRegisterMethods: data.allowedRegisterMethods,
            defaultLoginMethod: data.defaultLoginMethod,
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
    setDefaultLoginMethod(initialData.defaultLoginMethod);
    setAllowMultipleLogin(initialData.allowMultipleLogin);
    setShowPolicyAgreement(initialData.showPolicyAgreement);
  }, [initialData]);

  const toggleLogin = (value: LoginType) => {
    setAllowedLoginMethods((prev) => {
      const next = prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
      if (next.length === 0) return prev;
      if (!next.includes(defaultLoginMethod)) {
        setDefaultLoginMethod(next[0]);
      }
      return next;
    });
  };

  const toggleRegister = (value: LoginType) => {
    setAllowedRegisterMethods((prev) => {
      const next = prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
      if (next.length === 0) return prev;
      return next;
    });
  };

  const handleSave = () => {
    if (allowedRegisterMethods.length === 0) {
      toast.error("必须选择其中一种注册方式");
      return;
    }
    if (allowedLoginMethods.length === 0) {
      toast.error("至少保留一种登录方式");
      return;
    }
    if (!allowedLoginMethods.includes(defaultLoginMethod)) {
      toast.error("默认登录方式必须在已选登录方式中");
      return;
    }
    setMutation.mutate({
      allowedLoginMethods,
      allowedRegisterMethods,
      defaultLoginMethod,
      allowMultipleLogin,
      showPolicyAgreement,
    });
  };

  const handleReset = () => {
    if (!initialData) return;
    setAllowedLoginMethods(initialData.allowedLoginMethods);
    setAllowedRegisterMethods(initialData.allowedRegisterMethods);
    setDefaultLoginMethod(initialData.defaultLoginMethod);
    setAllowMultipleLogin(initialData.allowMultipleLogin);
    setShowPolicyAgreement(initialData.showPolicyAgreement);
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
        <h1 className="text-2xl font-semibold">登录设置</h1>

        <FieldGroup>
          <FieldLabel>注册方式</FieldLabel>
          <div className="flex flex-wrap gap-6">
            {LOGIN_TYPE_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <Checkbox
                  id={`register-${opt.value}`}
                  checked={allowedRegisterMethods.includes(opt.value)}
                  onCheckedChange={() => toggleRegister(opt.value)}
                />
                <Label htmlFor={`register-${opt.value}`} className="cursor-pointer font-normal">
                  {opt.label}注册
                </Label>
              </div>
            ))}
          </div>
          <FieldDescription>必须选择其中一种注册方式</FieldDescription>
        </FieldGroup>

        <FieldGroup>
          <FieldLabel>
            <span className="text-destructive">*</span> 登录方式
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
                  {opt.label}登录
                </Label>
              </div>
            ))}
          </div>
          <FieldDescription>至少保留一种登录方式，且默认登录方式不能取消</FieldDescription>
        </FieldGroup>

        <FieldGroup>
          <FieldLabel>
            <span className="text-destructive">*</span> 默认登录方式
          </FieldLabel>
          <RadioGroup
            value={String(defaultLoginMethod)}
            onValueChange={(v) => setDefaultLoginMethod(Number(v) as LoginType)}
            className="flex flex-wrap gap-6"
          >
            {LOGIN_TYPE_OPTIONS.filter((opt) => allowedLoginMethods.includes(opt.value)).map(
              (opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem value={String(opt.value)} id={`default-${opt.value}`} />
                  <Label htmlFor={`default-${opt.value}`} className="cursor-pointer font-normal">
                    {opt.label}登录
                  </Label>
                </div>
              ),
            )}
          </RadioGroup>
          <FieldDescription>设置在前台的默认登录方式</FieldDescription>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <div className="flex max-w-sm items-center justify-between gap-4">
              <div>
                <FieldLabel>多处登录</FieldLabel>
                <FieldDescription>是否允许多处同时登录</FieldDescription>
              </div>
              <Switch checked={allowMultipleLogin} onCheckedChange={setAllowMultipleLogin} />
            </div>
          </Field>
          <Field>
            <div className="flex max-w-sm items-center justify-between gap-4">
              <div>
                <FieldLabel>是否开启协议</FieldLabel>
                <FieldDescription>用户登录/注册时，是否显示服务协议和隐私政策</FieldDescription>
              </div>
              <Switch checked={showPolicyAgreement} onCheckedChange={setShowPolicyAgreement} />
            </div>
          </Field>
          <FieldDescription>
            谷歌登录凭证请在{" "}
            <Link to="/console/channel/google-oa" className="text-primary">
              渠道 - 谷歌登录配置
            </Link>{" "}
            中设置
          </FieldDescription>
          <FieldDescription>
            微信登录凭证请在{" "}
            <Link to="/console/channel/wechat-oa" className="text-primary">
              渠道 - 微信公众号配置
            </Link>{" "}
            中设置
          </FieldDescription>
        </FieldGroup>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={setMutation.isPending}>
            {setMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            保存设置
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={!initialData}>
            重置设置
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default SystemLoginConfigIndexPage;
