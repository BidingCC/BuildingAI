import { LOGIN_TYPE } from "@buildingai/constants/shared/auth";
import { SmsScene } from "@buildingai/constants/shared/sms.constant";
import {
  getWechatQrcode,
  getWechatQrcodeStatus,
  useCheckAccountMutation,
  useLoginMutation,
  useRegisterMutation,
  useSendSmsCodeMutation,
  useSmsLoginMutation,
} from "@buildingai/services/web";
import { useAuthStore, useConfigStore } from "@buildingai/stores";
import SvgIcons from "@buildingai/ui/components/svg-icons";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@buildingai/ui/components/ui/card";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldSeparator,
} from "@buildingai/ui/components/ui/field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@buildingai/ui/components/ui/form";
import { Input, PasswordInput } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { cn } from "@buildingai/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";

import { AgreementDialog, type AgreementType } from "@/components/agreement-dialog";

const PageEnum = {
  ACCOUNT_INPUT: "account-input",
  PASSWORD: "password",
  VERIFICATION_CODE: "verification-code",
  REGISTER: "register",
} as const;

const accountSchema = z.object({
  account: z.string().min(1, { message: "请输入账号/手机号" }),
});

const loginPasswordSchema = z.object({
  password: z.string().min(6, { message: "密码至少6位" }),
});

const verifyCodeSchema = z.object({
  code: z.string().length(6, { message: "请输入6位验证码" }),
});

const registerFormSchema = z
  .object({
    username: z
      .string()
      .min(3, { message: "用户名至少3位" })
      .max(20, { message: "用户名最多20位" })
      .regex(/^[a-zA-Z0-9_]+$/, { message: "用户名只能包含字母、数字、下划线" }),
    password: z.string().min(6, { message: "密码至少6位" }),
    confirmPassword: z.string().min(6, { message: "确认密码至少6位" }),
    nickname: z.string().optional(),
    email: z.string().email({ message: "邮箱格式不正确" }).optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次密码不一致",
    path: ["confirmPassword"],
  });

type AccountFormValues = z.infer<typeof accountSchema>;
type LoginPasswordFormValues = z.infer<typeof loginPasswordSchema>;
type VerifyCodeFormValues = z.infer<typeof verifyCodeSchema>;
type RegisterFormValues = z.infer<typeof registerFormSchema>;

const MOBILE_REGEX = /^1[3-9]\d{9}$/;

const FormTitle: Record<string, { title: string; description: string }> = {
  [PageEnum.ACCOUNT_INPUT]: {
    title: "欢迎回来",
    description: "输入你的用户名、邮箱、手机号登录",
  },
  [PageEnum.PASSWORD]: {
    title: "欢迎回来",
    description: "输入你的密码",
  },
  [PageEnum.VERIFICATION_CODE]: {
    title: "验证码登录",
    description: "我们将向您的邮箱或手机发送验证码",
  },
  [PageEnum.REGISTER]: {
    title: "创建账号",
    description: "使用用户名和密码注册",
  },
};

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [page, setPage] = useState<string>(PageEnum.ACCOUNT_INPUT);
  const [checkResult, setCheckResult] = useState<{
    type: string;
    hasPassword: boolean;
    account: string;
  } | null>(null);
  const { confirm } = useAlertDialog();
  const { setToken } = useAuthStore((state) => state.authActions);
  const { websiteConfig } = useConfigStore((state) => state.config);
  const [agree, setAgree] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [activeAgreement, setActiveAgreement] = useState<AgreementType>("service");
  const [wechatDialogOpen, setWechatDialogOpen] = useState(false);
  const [wechatQrUrl, setWechatQrUrl] = useState("");
  const [wechatQrKey, setWechatQrKey] = useState("");
  const [wechatLoading, setWechatLoading] = useState(false);
  const [wechatStatus, setWechatStatus] = useState<
    "normal" | "success" | "invalid" | "error" | "code_error"
  >("normal");
  const wechatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wechatPollStartRef = useRef<number>(0);
  const [smsCountdown, setSmsCountdown] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect =
    (location.state as { redirect?: string })?.redirect ?? searchParams.get("redirect") ?? "";

  const handleRedirect = useCallback(
    (path: string, token?: string) => {
      const isPluginPath = path.includes("/extension/");

      if (isPluginPath && import.meta.env.DEV && token) {
        const encodedToken = btoa(token);
        const url = new URL(path, window.location.origin);
        url.searchParams.set("_t", encodedToken);
        window.location.replace(url.toString());
      } else if (path.startsWith("http")) {
        window.location.replace(path);
      } else if (isPluginPath) {
        window.location.replace(path);
      } else {
        navigate(path, { replace: true });
      }
    },
    [navigate],
  );

  const loginSettings = websiteConfig?.loginSettings;
  const allowAccountLogin =
    loginSettings?.allowedLoginMethods?.includes(LOGIN_TYPE.ACCOUNT) ?? true;
  const allowPhoneLogin = loginSettings?.allowedLoginMethods?.includes(LOGIN_TYPE.PHONE) ?? false;
  const allowWechatLogin = loginSettings?.allowedLoginMethods?.includes(LOGIN_TYPE.WECHAT) ?? true;
  const allowGoogleLogin = loginSettings?.allowedLoginMethods?.includes(LOGIN_TYPE.GOOGLE) ?? true;
  const allowAccountRegister =
    loginSettings?.allowedRegisterMethods?.includes(LOGIN_TYPE.ACCOUNT) ?? true;
  const allowPhoneRegister =
    loginSettings?.allowedRegisterMethods?.includes(LOGIN_TYPE.PHONE) ?? false;
  const canUseAccountInput = allowAccountLogin || allowPhoneLogin;
  const showPolicyAgreement = loginSettings?.showPolicyAgreement ?? true;
  const loginError = searchParams.get("error");
  const accountLoginLabel = allowAccountLogin && allowPhoneLogin ? "账号 / 手机号" : "账号";
  const accountLoginPlaceholder = allowAccountLogin
    ? allowPhoneLogin
      ? "请输入账号或手机号"
      : "请输入账号"
    : "请输入手机号";

  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { account: "" },
  });

  const passwordForm = useForm<LoginPasswordFormValues>({
    resolver: zodResolver(loginPasswordSchema),
    defaultValues: { password: "" },
  });

  const verifyCodeForm = useForm<VerifyCodeFormValues>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { code: "" },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      nickname: "",
      email: "",
    },
  });

  const { mutateAsync: checkAccount, isPending: isCheckPending } = useCheckAccountMutation();
  const { mutateAsync: login, isPending: isLoginPending } = useLoginMutation();
  const { mutateAsync: register, isPending: isRegisterPending } = useRegisterMutation();
  const { mutateAsync: sendSmsCode, isPending: isSendSmsCodePending } = useSendSmsCodeMutation();
  const { mutateAsync: smsLogin, isPending: isSmsLoginPending } = useSmsLoginMutation();

  useEffect(() => {
    if (smsCountdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSmsCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [smsCountdown]);

  useEffect(() => {
    if (page === PageEnum.REGISTER && !allowAccountRegister) {
      setPage(PageEnum.ACCOUNT_INPUT);
    }
  }, [allowAccountRegister, page]);

  const handleOpenAgreement = useCallback((type: AgreementType) => {
    setActiveAgreement(type);
    setAgreementOpen(true);
  }, []);

  const renderAgreementTrigger = (checkboxId: string) => (
    <span className="flex flex-wrap items-center gap-1">
      <Label htmlFor={checkboxId}>我已阅读并同意</Label>
      <button
        type="button"
        className="text-primary underline-offset-4 hover:underline"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleOpenAgreement("service");
        }}
      >
        《用户协议》
      </button>
      <span>和</span>
      <button
        type="button"
        className="text-primary underline-offset-4 hover:underline"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleOpenAgreement("privacy");
        }}
      >
        《隐私政策》
      </button>
    </span>
  );

  const ensureAgreed = async () => {
    if (!showPolicyAgreement || agree) return true;
    try {
      await confirm({
        title: "服务协议及隐私保护",
        description: (
          <span>
            确认即表示你已阅读并同意{websiteConfig?.webinfo.name}的
            <button
              type="button"
              className="text-primary inline underline-offset-4 hover:underline"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleOpenAgreement("service");
              }}
            >
              《用户协议》
            </button>
            和
            <button
              type="button"
              className="text-primary inline underline-offset-4 hover:underline"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleOpenAgreement("privacy");
              }}
            >
              《隐私政策》
            </button>
          </span>
        ),
        onConfirm: () => setAgree(true),
      });
      return true;
    } catch {
      return false;
    }
  };

  const onAccountNext = async (values: AccountFormValues) => {
    const isMobileAccount = MOBILE_REGEX.test(values.account);
    const res = await checkAccount({ account: values.account });
    if (!res.hasAccount) {
      if (isMobileAccount && allowPhoneLogin) {
        if (!allowPhoneRegister) {
          accountForm.setError("account", {
            message: "账号不存在，请先注册",
          });
          return;
        }
        setCheckResult({
          type: "mobile",
          hasPassword: false,
          account: values.account,
        });
        setPage(PageEnum.VERIFICATION_CODE);
        return;
      }

      accountForm.setError("account", {
        message: allowAccountRegister ? "账号不存在，请先注册" : "账号不存在",
      });
      return;
    }

    if (res.type === "username" || res.type === "email") {
      if (!allowAccountLogin) {
        accountForm.setError("account", { message: "账号密码登录未开启" });
        return;
      }
    }

    if (res.type === "mobile" && !allowAccountLogin && !allowPhoneLogin) {
      accountForm.setError("account", { message: "手机号登录未开启" });
      return;
    }

    setCheckResult({
      type: res.type,
      hasPassword: res.hasPassword,
      account: values.account,
    });
    if (res.type === "username") {
      setPage(PageEnum.PASSWORD);
      return;
    }
    if (res.type === "email") {
      setPage(PageEnum.PASSWORD);
      return;
    }
    if (res.type === "mobile") {
      if (res.hasPassword && allowAccountLogin) {
        setPage(PageEnum.PASSWORD);
        return;
      }
      if (allowPhoneLogin) {
        setPage(PageEnum.VERIFICATION_CODE);
        return;
      }
      accountForm.setError("account", { message: "手机号短信登录未开启" });
    }
  };

  const onPasswordSubmit = async (values: LoginPasswordFormValues) => {
    if (!checkResult) return;
    const agreed = await ensureAgreed();
    if (!agreed) return;
    const data = await login({
      username: checkResult.account,
      password: values.password,
      terminal: 1,
    });
    setToken(data.token);
    handleRedirect(redirect || "/", data.token);
  };

  /**
   * 发送短信验证码
   */
  const onSendSmsCode = async () => {
    if (!checkResult || checkResult.type !== "mobile") {
      verifyCodeForm.setError("code", { message: "仅支持手机号验证码登录" });
      return;
    }

    if (smsCountdown > 0) {
      return;
    }

    await sendSmsCode({
      mobile: checkResult.account,
      scene: SmsScene.LOGIN,
      areaCode: "86",
    });
    setSmsCountdown(60);
  };

  const onVerifyCodeSubmit = async (values: VerifyCodeFormValues) => {
    if (!checkResult || checkResult.type !== "mobile") {
      verifyCodeForm.setError("code", { message: "手机号信息缺失，请重新输入" });
      return;
    }

    const agreed = await ensureAgreed();
    if (!agreed) {
      return;
    }

    const data = await smsLogin({
      mobile: checkResult.account,
      code: values.code,
      terminal: 1,
      areaCode: "86",
    });

    setToken(data.token);
    handleRedirect(redirect || "/", data.token);
  };

  const handleBackToAccountInput = () => {
    setPage(PageEnum.ACCOUNT_INPUT);
    setCheckResult(null);
    setSmsCountdown(0);
    verifyCodeForm.reset();
  };

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    const agreed = await ensureAgreed();
    if (!agreed) return;
    const data = await register({
      username: values.username,
      password: values.password,
      confirmPassword: values.confirmPassword,
      terminal: 1,
      ...(values.nickname && { nickname: values.nickname }),
      ...(values.email && { email: values.email }),
    });
    setToken(data.token);
    handleRedirect(redirect || "/", data.token);
  };

  const fetchWechatQrCode = useCallback(async () => {
    setWechatLoading(true);
    setWechatStatus("normal");
    setWechatQrUrl("");
    setWechatQrKey("");
    try {
      const data = await getWechatQrcode();
      setWechatQrUrl(data.url);
      setWechatQrKey(data.key ?? "");
    } catch {
      setWechatStatus("code_error");
    } finally {
      setWechatLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!wechatDialogOpen) return;
    fetchWechatQrCode();
  }, [wechatDialogOpen, fetchWechatQrCode]);

  useEffect(() => {
    if (!wechatQrKey || wechatStatus === "success" || wechatStatus === "invalid") return;
    const POLL_INTERVAL = 2000;
    const MAX_POLL_MS = 60 * 1000;
    wechatPollStartRef.current = Date.now();
    wechatPollRef.current = setInterval(async () => {
      if (Date.now() - wechatPollStartRef.current > MAX_POLL_MS) {
        if (wechatPollRef.current) clearInterval(wechatPollRef.current);
        wechatPollRef.current = null;
        setWechatStatus("invalid");
        return;
      }
      try {
        const data = await getWechatQrcodeStatus(wechatQrKey);
        if (data.is_scan && data.token) {
          if (wechatPollRef.current) clearInterval(wechatPollRef.current);
          wechatPollRef.current = null;
          setWechatStatus("success");
          setToken(data.token);
          setWechatDialogOpen(false);
          handleRedirect(redirect || "/", data.token);
        } else if (data.error) {
          if (wechatPollRef.current) clearInterval(wechatPollRef.current);
          wechatPollRef.current = null;
          setWechatStatus("error");
        }
      } catch {
        if (wechatPollRef.current) clearInterval(wechatPollRef.current);
        wechatPollRef.current = null;
        setWechatStatus("invalid");
      }
    }, POLL_INTERVAL);
    return () => {
      if (wechatPollRef.current) clearInterval(wechatPollRef.current);
      wechatPollRef.current = null;
    };
  }, [wechatQrKey, wechatStatus, setToken, navigate, redirect]);

  useEffect(() => {
    if (!wechatDialogOpen) {
      if (wechatPollRef.current) clearInterval(wechatPollRef.current);
      wechatPollRef.current = null;
      setWechatQrUrl("");
      setWechatQrKey("");
      setWechatStatus("normal");
    }
  }, [wechatDialogOpen]);

  const handleWechatLogin = async () => {
    const agreed = await ensureAgreed();
    if (agreed) setWechatDialogOpen(true);
  };

  const renderAccountStep = () => (
    <Form {...accountForm}>
      <form onSubmit={accountForm.handleSubmit(onAccountNext)}>
        <FieldGroup className="gap-5">
          {allowWechatLogin && (
            <Field className="flex flex-wrap gap-2">
              {allowWechatLogin && (
                <Dialog open={wechatDialogOpen} onOpenChange={setWechatDialogOpen}>
                  <Button variant="secondary" type="button" onClick={handleWechatLogin}>
                    <SvgIcons.wechat />
                    微信登录
                  </Button>
                  <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                      <DialogTitle>微信登录</DialogTitle>
                      <DialogDescription>请扫描二维码登录</DialogDescription>
                    </DialogHeader>
                    <div className="flex w-full flex-col items-center justify-center gap-4 py-2">
                      <div className="relative flex size-52 items-center justify-center overflow-hidden rounded-lg border p-1">
                        {wechatLoading && <Skeleton className="size-full" />}
                        {!wechatLoading && wechatQrUrl && (
                          <>
                            <img
                              src={wechatQrUrl}
                              alt="微信登录二维码"
                              className="pointer-events-none size-full object-contain select-none"
                            />
                            {(wechatStatus === "success" ||
                              wechatStatus === "invalid" ||
                              wechatStatus === "error" ||
                              wechatStatus === "code_error") && (
                              <div className="bg-background/80 absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-sm">
                                {wechatStatus === "success" && (
                                  <>
                                    <CheckCircle2 className="text-primary mb-2 size-12" />
                                    <p className="text-muted-foreground text-sm">
                                      登录成功，正在跳转...
                                    </p>
                                  </>
                                )}
                                {(wechatStatus === "invalid" || wechatStatus === "error") && (
                                  <>
                                    <AlertCircle className="text-destructive mb-2 size-12" />
                                    <p className="text-muted-foreground mb-3 text-center text-sm">
                                      {wechatStatus === "invalid"
                                        ? "二维码已过期，请刷新"
                                        : "登录失败，请重试"}
                                    </p>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={fetchWechatQrCode}
                                    >
                                      刷新二维码
                                    </Button>
                                  </>
                                )}
                                {wechatStatus === "code_error" && (
                                  <>
                                    <AlertCircle className="text-destructive mb-2 size-12" />
                                    <p className="text-muted-foreground mb-3 text-center text-sm">
                                      获取二维码失败，请重试
                                    </p>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={fetchWechatQrCode}
                                    >
                                      刷新二维码
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </Field>
          )}
          {allowGoogleLogin && (
            <Field className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => (window.location.href = "/api/auth/google")}
              >
                <SvgIcons.google />
                Google 登录
              </Button>
            </Field>
          )}
          {allowWechatLogin && canUseAccountInput && (
            <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
              或使用账号登录
            </FieldSeparator>
          )}
          {canUseAccountInput && (
            <>
              <FormField
                control={accountForm.control}
                name="account"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{allowAccountLogin ? accountLoginLabel : "手机号"}</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder={accountLoginPlaceholder}
                        {...field}
                        autoComplete="username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Field>
                <Button type="submit" className="w-full" loading={isCheckPending}>
                  下一步 <ArrowRight />
                </Button>
                <FieldDescription className="text-center">
                  {allowAccountRegister ? (
                    <>
                      还没有账号？{""}
                      <button
                        type="button"
                        className="text-primary underline-offset-4 hover:underline"
                        onClick={() => setPage(PageEnum.REGISTER)}
                      >
                        注册
                      </button>
                    </>
                  ) : null}
                </FieldDescription>
              </Field>
            </>
          )}
        </FieldGroup>
      </form>
    </Form>
  );

  const renderPasswordStep = () => (
    <Form {...passwordForm}>
      <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
        <FieldGroup className="gap-5">
          {checkResult?.type === "mobile" && allowPhoneLogin && (
            <Field>
              <Button
                variant="secondary"
                type="button"
                className="w-full"
                onClick={() => setPage(PageEnum.VERIFICATION_CODE)}
              >
                验证码登录
              </Button>
            </Field>
          )}
          {checkResult?.type === "mobile" && allowPhoneLogin && (
            <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
              或使用密码登录
            </FieldSeparator>
          )}
          <FormField
            control={passwordForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>密码</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="current-password"
                    placeholder="请输入密码"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {showPolicyAgreement && (
            <Field>
              <FieldDescription>
                <span className="flex items-center gap-3">
                  <Checkbox
                    checked={agree}
                    onCheckedChange={(e) => setAgree(e as boolean)}
                    id="terms-login"
                  />
                  {renderAgreementTrigger("terms-login")}
                </span>
              </FieldDescription>
            </Field>
          )}
          <Field>
            <Button type="submit" className="w-full" loading={isLoginPending}>
              登录 <ArrowRight />
            </Button>
            <FieldDescription className="text-center">
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => {
                  setPage(PageEnum.ACCOUNT_INPUT);
                  setCheckResult(null);
                }}
              >
                使用其他账号
              </button>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </Form>
  );

  const renderVerificationCodeStep = () => (
    <Form {...verifyCodeForm}>
      <form onSubmit={verifyCodeForm.handleSubmit(onVerifyCodeSubmit)}>
        <FieldGroup className="gap-5">
          {checkResult?.hasPassword && (
            <Field>
              <Button
                variant="secondary"
                type="button"
                className="w-full"
                onClick={() => setPage(PageEnum.PASSWORD)}
              >
                密码登录
              </Button>
            </Field>
          )}
          {checkResult?.hasPassword && (
            <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
              或使用验证码登录
            </FieldSeparator>
          )}
          <FormField
            control={verifyCodeForm.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>验证码</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input type="text" placeholder="请输入验证码" className="flex-1" {...field} />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onSendSmsCode}
                      loading={isSendSmsCodePending}
                      disabled={smsCountdown > 0 || isSendSmsCodePending}
                    >
                      {smsCountdown > 0 ? `${smsCountdown}s` : "获取验证码"}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FieldDescription className="text-muted-foreground text-center">
            验证码将发送至 {checkResult?.account}
          </FieldDescription>
          {showPolicyAgreement && (
            <Field>
              <FieldDescription>
                <span className="flex items-center gap-3">
                  <Checkbox
                    checked={agree}
                    onCheckedChange={(e) => setAgree(e as boolean)}
                    id="terms-sms-login"
                  />
                  {renderAgreementTrigger("terms-sms-login")}
                </span>
              </FieldDescription>
            </Field>
          )}
          <Field>
            <Button type="submit" className="w-full" loading={isSmsLoginPending}>
              登录 <ArrowRight />
            </Button>
            <FieldDescription className="text-center">
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={handleBackToAccountInput}
              >
                使用其他账号
              </button>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </Form>
  );

  const renderRegisterStep = () => (
    <Form {...registerForm}>
      <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
        <FieldGroup className="gap-5">
          <FormField
            control={registerForm.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>用户名</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="3-20位字母、数字、下划线"
                    {...field}
                    autoComplete="username"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={registerForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={registerForm.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>确认密码</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={registerForm.control}
            name="nickname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>昵称（选填）</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="昵称" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={registerForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>邮箱（选填）</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="m@example.com" {...field} autoComplete="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {showPolicyAgreement && (
            <Field>
              <FieldDescription>
                <span className="flex items-center gap-3">
                  <Checkbox
                    checked={agree}
                    onCheckedChange={(e) => setAgree(e as boolean)}
                    id="terms-register"
                  />
                  {renderAgreementTrigger("terms-register")}
                </span>
              </FieldDescription>
            </Field>
          )}
          <Field>
            <Button type="submit" className="w-full" loading={isRegisterPending}>
              注册 <ArrowRight />
            </Button>
            <FieldDescription className="text-center">
              已有账号？{" "}
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => setPage(PageEnum.ACCOUNT_INPUT)}
              >
                登录
              </button>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </Form>
  );

  const titleConfig = FormTitle[page] ?? FormTitle[PageEnum.ACCOUNT_INPUT];

  return (
    <>
      <div className={cn("flex flex-col gap-4", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{titleConfig.title}</CardTitle>
            <CardDescription>{titleConfig.description}</CardDescription>
            {loginError && (
              <p className="text-destructive text-sm">
                {loginError === "missing_code"
                  ? "授权未完成"
                  : loginError === "config"
                    ? "登录配置异常"
                    : loginError === "token_exchange" || loginError === "no_access_token"
                      ? "授权验证失败"
                      : loginError === "userinfo"
                        ? "获取用户信息失败"
                        : "登录失败，请重试"}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {page === PageEnum.ACCOUNT_INPUT && renderAccountStep()}
            {page === PageEnum.PASSWORD && renderPasswordStep()}
            {page === PageEnum.VERIFICATION_CODE && renderVerificationCodeStep()}
            {page === PageEnum.REGISTER && renderRegisterStep()}
          </CardContent>
        </Card>
      </div>
      <AgreementDialog
        open={agreementOpen}
        onOpenChange={setAgreementOpen}
        type={activeAgreement}
      />
    </>
  );
}
