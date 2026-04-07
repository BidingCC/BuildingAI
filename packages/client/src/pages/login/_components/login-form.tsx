import { LOGIN_TYPE } from "@buildingai/constants/shared/auth";
import { SmsScene } from "@buildingai/constants/shared/sms.constant";
import { useI18n } from "@buildingai/i18n";
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

// Schema factories that accept t() at runtime to support i18n
const createAccountSchema = (t: (key: string) => string) =>
  z.object({
    account: z.string().min(1, { message: t("auth.accountInput") }),
  });

const createLoginPasswordSchema = (t: (key: string) => string) =>
  z.object({
    password: z.string().min(6, { message: t("auth.passwordMinLength") }),
  });

const createVerifyCodeSchema = (t: (key: string) => string) =>
  z.object({
    code: z.string().length(6, { message: t("auth.codeLength") }),
  });

const createRegisterFormSchema = (t: (key: string) => string) =>
  z
    .object({
      username: z
        .string()
        .min(3, { message: t("auth.usernameMinLength") })
        .max(20, { message: t("auth.usernameMaxLength") })
        .regex(/^[a-zA-Z0-9_]+$/, { message: t("auth.usernamePattern") }),
      password: z.string().min(6, { message: t("auth.passwordMinLength") }),
      confirmPassword: z.string().min(6, { message: t("auth.confirmPasswordMinLength") }),
      nickname: z.string().optional(),
      email: z
        .string()
        .email({ message: t("auth.emailFormat") })
        .optional()
        .or(z.literal("")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("auth.passwordMismatch"),
      path: ["confirmPassword"],
    });

type AccountFormValues = z.infer<ReturnType<typeof createAccountSchema>>;
type LoginPasswordFormValues = z.infer<ReturnType<typeof createLoginPasswordSchema>>;
type VerifyCodeFormValues = z.infer<ReturnType<typeof createVerifyCodeSchema>>;
type RegisterFormValues = z.infer<ReturnType<typeof createRegisterFormSchema>>;

const MOBILE_REGEX = /^1[3-9]\d{9}$/;

const FormTitle: Record<string, { title: string; description: string }> = {
  [PageEnum.ACCOUNT_INPUT]: {
    title: "auth.welcomeBack",
    description: "auth.accountInputHint",
  },
  [PageEnum.PASSWORD]: {
    title: "auth.welcomeBack",
    description: "auth.passwordHint",
  },
  [PageEnum.VERIFICATION_CODE]: {
    title: "auth.loginWithCode",
    description: "auth.sendingCode",
  },
  [PageEnum.REGISTER]: {
    title: "auth.registerTitle",
    description: "auth.registerTitle",
  },
};

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const { t } = useI18n();
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
  const accountLoginLabel =
    allowAccountLogin && allowPhoneLogin ? t("auth.accountOrPhone") : t("auth.account");
  const accountLoginPlaceholder = allowAccountLogin
    ? allowPhoneLogin
      ? t("auth.accountInputHint")
      : t("auth.accountHint")
    : t("auth.phoneHint");

  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(createAccountSchema(t)),
    defaultValues: { account: "" },
  });

  const passwordForm = useForm<LoginPasswordFormValues>({
    resolver: zodResolver(createLoginPasswordSchema(t)),
    defaultValues: { password: "" },
  });

  const verifyCodeForm = useForm<VerifyCodeFormValues>({
    resolver: zodResolver(createVerifyCodeSchema(t)),
    defaultValues: { code: "" },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(createRegisterFormSchema(t)),
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
      <Label htmlFor={checkboxId}>{t("auth.policyAgreement")}</Label>
      <button
        type="button"
        className="text-primary underline-offset-4 hover:underline"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleOpenAgreement("service");
        }}
      >
        {t("auth.userAgreement")}
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
        {t("auth.privacyPolicy")}
      </button>
    </span>
  );

  const ensureAgreed = async () => {
    if (!showPolicyAgreement || agree) return true;
    try {
      await confirm({
        title: t("auth.serviceAgreement"),
        description: (
          <span>
            {t("auth.confirmPolicy")}
            {websiteConfig?.webinfo.name}的
            <button
              type="button"
              className="text-primary inline underline-offset-4 hover:underline"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleOpenAgreement("service");
              }}
            >
              {t("auth.userAgreement")}
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
            message: t("auth.accountNotExist"),
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
        message: allowAccountRegister
          ? t("auth.accountNotExist")
          : t("auth.accountNotExistNoRegister"),
      });
      return;
    }

    if (res.type === "username" || res.type === "email") {
      if (!allowAccountLogin) {
        accountForm.setError("account", { message: t("auth.passwordLoginNotEnabled") });
        return;
      }
    }

    if (res.type === "mobile" && !allowAccountLogin && !allowPhoneLogin) {
      accountForm.setError("account", { message: t("auth.phoneLoginNotEnabled") });
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
      accountForm.setError("account", { message: t("auth.phoneLoginNotEnabled") });
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
      verifyCodeForm.setError("code", { message: t("auth.smsLoginNotSupported") });
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
      verifyCodeForm.setError("code", { message: t("auth.phoneInfoMissing") });
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
                    {t("auth.loginWithWechat")}
                  </Button>
                  <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                      <DialogTitle>{t("auth.loginWithWechat")}</DialogTitle>
                      <DialogDescription>{t("auth.scanQrCode")}</DialogDescription>
                    </DialogHeader>
                    <div className="flex w-full flex-col items-center justify-center gap-4 py-2">
                      <div className="relative flex size-52 items-center justify-center overflow-hidden rounded-lg border p-1">
                        {wechatLoading && <Skeleton className="size-full" />}
                        {!wechatLoading && wechatQrUrl && (
                          <>
                            <img
                              src={wechatQrUrl}
                              alt={t("auth.loginWithWechat")}
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
                                      {t("auth.loginSuccessRedirect")}
                                    </p>
                                  </>
                                )}
                                {(wechatStatus === "invalid" || wechatStatus === "error") && (
                                  <>
                                    <AlertCircle className="text-destructive mb-2 size-12" />
                                    <p className="text-muted-foreground mb-3 text-center text-sm">
                                      {wechatStatus === "invalid"
                                        ? t("auth.qrCodeExpired")
                                        : t("auth.loginFailed")}
                                    </p>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={fetchWechatQrCode}
                                    >
                                      {t("auth.refreshQrCode")}
                                    </Button>
                                  </>
                                )}
                                {wechatStatus === "code_error" && (
                                  <>
                                    <AlertCircle className="text-destructive mb-2 size-12" />
                                    <p className="text-muted-foreground mb-3 text-center text-sm">
                                      {t("auth.qrCodeFailed")}
                                    </p>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={fetchWechatQrCode}
                                    >
                                      {t("auth.refreshQrCode")}
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
                {t("auth.loginWithGoogle")}
              </Button>
            </Field>
          )}
          {allowWechatLogin && canUseAccountInput && (
            <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
              {t("auth.orUseAccountLogin")}
            </FieldSeparator>
          )}
          {canUseAccountInput && (
            <>
              <FormField
                control={accountForm.control}
                name="account"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{allowAccountLogin ? accountLoginLabel : t("auth.phone")}</FormLabel>
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
                  {t("auth.next")} <ArrowRight />
                </Button>
                <FieldDescription className="text-center">
                  {allowAccountRegister ? (
                    <>
                      {t("auth.noAccount")}
                      {""}
                      <button
                        type="button"
                        className="text-primary underline-offset-4 hover:underline"
                        onClick={() => setPage(PageEnum.REGISTER)}
                      >
                        {t("auth.register")}
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
                {t("auth.loginWithCode")}
              </Button>
            </Field>
          )}
          {checkResult?.type === "mobile" && allowPhoneLogin && (
            <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
              {t("auth.orUsePasswordLogin")}
            </FieldSeparator>
          )}
          <FormField
            control={passwordForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.password")}</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="current-password"
                    placeholder={t("auth.passwordHint")}
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
              {t("auth.login")} <ArrowRight />
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
                {t("auth.useOtherAccount")}
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
                {t("auth.loginWithPassword")}
              </Button>
            </Field>
          )}
          {checkResult?.hasPassword && (
            <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
              {t("auth.orUseCodeLogin")}
            </FieldSeparator>
          )}
          <FormField
            control={verifyCodeForm.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.verificationCode")}</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder={t("auth.codeHint")}
                      className="flex-1"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onSendSmsCode}
                      loading={isSendSmsCodePending}
                      disabled={smsCountdown > 0 || isSendSmsCodePending}
                    >
                      {smsCountdown > 0
                        ? t("auth.countdown", { count: smsCountdown })
                        : t("auth.getCode")}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FieldDescription className="text-muted-foreground text-center">
            {t("auth.sendingCode")} {checkResult?.account}
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
              {t("auth.login")} <ArrowRight />
            </Button>
            <FieldDescription className="text-center">
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={handleBackToAccountInput}
              >
                {t("auth.useOtherAccount")}
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
                <FormLabel>{t("auth.username")}</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder={t("auth.usernameHint")}
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
                <FormLabel>{t("auth.password")}</FormLabel>
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
                <FormLabel>{t("auth.confirmPassword")}</FormLabel>
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
                <FormLabel>{t("auth.nickname")}</FormLabel>
                <FormControl>
                  <Input type="text" placeholder={t("auth.nicknameHint")} {...field} />
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
                <FormLabel>{t("auth.email")}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={t("auth.emailHint")}
                    {...field}
                    autoComplete="email"
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
                    id="terms-register"
                  />
                  {renderAgreementTrigger("terms-register")}
                </span>
              </FieldDescription>
            </Field>
          )}
          <Field>
            <Button type="submit" className="w-full" loading={isRegisterPending}>
              {t("auth.register")} <ArrowRight />
            </Button>
            <FieldDescription className="text-center">
              {t("auth.hasAccount")}{" "}
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => setPage(PageEnum.ACCOUNT_INPUT)}
              >
                {t("auth.login")}
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
            <CardTitle className="text-xl">{t(titleConfig.title)}</CardTitle>
            <CardDescription>{t(titleConfig.description)}</CardDescription>
            {loginError && (
              <p className="text-destructive text-sm">
                {loginError === "missing_code"
                  ? t("auth.loginError.missing_code")
                  : loginError === "config"
                    ? t("auth.loginError.config")
                    : loginError === "token_exchange" || loginError === "no_access_token"
                      ? t("auth.loginError.token_exchange")
                      : loginError === "userinfo"
                        ? t("auth.loginError.userinfo")
                        : t("auth.loginError.default")}
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
