import { LOGIN_TYPE } from "@buildingai/constants/shared/auth";
import {
  useCheckAccountMutation,
  useLoginMutation,
  useRegisterMutation,
} from "@buildingai/services/web";
import { useAuthStore, useConfigStore } from "@buildingai/stores";
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
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";

import SvgIcons from "../../../components/svg-icons";

const PageEnum = {
  ACCOUNT_INPUT: "account-input",
  PASSWORD: "password",
  VERIFICATION_CODE: "verification-code",
  REGISTER: "register",
} as const;

const accountSchema = z.object({
  account: z.string().min(1, { message: "请输入邮箱/账号/手机号" }),
});

const loginPasswordSchema = z.object({
  password: z.string().min(6, { message: "密码至少6位" }),
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
type RegisterFormValues = z.infer<typeof registerFormSchema>;

const FormTitle: Record<string, { title: string; description: string }> = {
  [PageEnum.ACCOUNT_INPUT]: {
    title: "Welcome back",
    description: "Enter your email, account or phone",
  },
  [PageEnum.PASSWORD]: {
    title: "Welcome back",
    description: "Enter your password",
  },
  [PageEnum.VERIFICATION_CODE]: {
    title: "Verification code",
    description: "We will send a code to your email or phone",
  },
  [PageEnum.REGISTER]: {
    title: "Create account",
    description: "Register with username and password",
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
  const [wechatDialogOpen, setWechatDialogOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect =
    (location.state as { redirect?: string })?.redirect ?? searchParams.get("redirect") ?? "";

  const loginSettings = websiteConfig?.loginSettings;
  const allowAccount = loginSettings?.allowedLoginMethods?.includes(LOGIN_TYPE.ACCOUNT) ?? true;
  const allowWechat = loginSettings?.allowedLoginMethods?.includes(LOGIN_TYPE.WECHAT) ?? true;
  const allowGoogle = loginSettings?.allowedLoginMethods?.includes(LOGIN_TYPE.GOOGLE) ?? false;
  const showPolicyAgreement = loginSettings?.showPolicyAgreement ?? true;
  const loginError = searchParams.get("error");

  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { account: "" },
  });

  const passwordForm = useForm<LoginPasswordFormValues>({
    resolver: zodResolver(loginPasswordSchema),
    defaultValues: { password: "" },
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

  const ensureAgreed = async () => {
    if (!showPolicyAgreement || agree) return true;
    try {
      await confirm({
        title: "服务协议及隐私保护",
        description: (
          <span>
            确认即表示你已阅读并同意{websiteConfig?.webinfo.name}的
            <a href="#" target="_blank" className="text-primary">
              《用户协议》
            </a>
            和
            <a href="#" target="_blank" className="text-primary">
              《隐私政策》
            </a>
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
    const res = await checkAccount({ account: values.account });
    if (!res.hasAccount) {
      accountForm.setError("account", { message: "账号不存在，请先注册" });
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
    if (res.type === "email" || res.type === "mobile") {
      setPage(res.hasPassword ? PageEnum.PASSWORD : PageEnum.VERIFICATION_CODE);
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
    navigate(redirect || "/", { replace: true });
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
    navigate(redirect || "/", { replace: true });
  };

  const handleWechatLogin = async () => {
    const agreed = await ensureAgreed();
    if (agreed) setWechatDialogOpen(true);
  };

  const getGoogleAuthUrl = () => {
    const base =
      import.meta.env.VITE_DEVELOP_APP_BASE_URL ||
      import.meta.env.VITE_PRODUCTION_APP_BASE_URL ||
      window.location.origin;
    const prefix = import.meta.env.VITE_APP_WEB_API_PREFIX || "/api";
    const url = `${base}${prefix}/auth/google`;
    return redirect ? `${url}?redirect=${encodeURIComponent(redirect)}` : url;
  };

  const isEmailOrMobile =
    checkResult && (checkResult.type === "email" || checkResult.type === "mobile");

  const renderAccountStep = () => (
    <Form {...accountForm}>
      <form onSubmit={accountForm.handleSubmit(onAccountNext)}>
        <FieldGroup className="gap-5">
          {(allowWechat || allowGoogle) && (
            <Field className="flex flex-wrap gap-2">
              {allowWechat && (
                <Dialog open={wechatDialogOpen} onOpenChange={setWechatDialogOpen}>
                  <Button variant="secondary" type="button" onClick={handleWechatLogin}>
                    <SvgIcons.wechat />
                    Login with Wechat
                  </Button>
                  <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                      <DialogTitle>Login with Wechat</DialogTitle>
                      <DialogDescription>Please scan the QR code to login</DialogDescription>
                    </DialogHeader>
                    <div className="flex w-full flex-col items-center justify-center gap-6">
                      <Skeleton className="size-40" />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {allowGoogle && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={async () => {
                    const agreed = await ensureAgreed();
                    if (agreed) window.location.href = getGoogleAuthUrl();
                  }}
                >
                  <SvgIcons.google />
                  Login with Google
                </Button>
              )}
            </Field>
          )}
          {(allowWechat || allowGoogle) && allowAccount && (
            <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
              Or continue with
            </FieldSeparator>
          )}
          {allowAccount && (
            <>
              <FormField
                control={accountForm.control}
                name="account"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email / Account / Phone</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="m@example.com or username or phone"
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
                  Next <ArrowRight />
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    className="text-primary underline-offset-4 hover:underline"
                    onClick={() => setPage(PageEnum.REGISTER)}
                  >
                    Sign up
                  </button>
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
          {isEmailOrMobile && (
            <Field>
              <Button
                variant="secondary"
                type="button"
                className="w-full"
                onClick={() => setPage(PageEnum.VERIFICATION_CODE)}
              >
                Verification code login
              </Button>
            </Field>
          )}
          {isEmailOrMobile && (
            <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
              Or continue with
            </FieldSeparator>
          )}
          <FormField
            control={passwordForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="current-password" {...field} />
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
                  <Label htmlFor="terms-login">Terms of Service and Privacy Policy.</Label>
                </span>
              </FieldDescription>
            </Field>
          )}
          <Field>
            <Button type="submit" className="w-full" loading={isLoginPending}>
              Login <ArrowRight />
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
                Use another account
              </button>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </Form>
  );

  const renderVerificationCodeStep = () => (
    <FieldGroup className="gap-5">
      {checkResult?.hasPassword && (
        <Field>
          <Button
            variant="secondary"
            type="button"
            className="w-full"
            onClick={() => setPage(PageEnum.PASSWORD)}
          >
            Password login
          </Button>
        </Field>
      )}
      {checkResult?.hasPassword && (
        <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
          Or continue with
        </FieldSeparator>
      )}
      <Field>
        <FormLabel>Verification code</FormLabel>
        <div className="flex gap-2">
          <Input type="text" placeholder="Enter code" className="flex-1" />
          <Button type="button" variant="secondary">
            Get code
          </Button>
        </div>
      </Field>
      <FieldDescription className="text-muted-foreground text-center">
        Code will be sent to {checkResult?.account}
      </FieldDescription>
      <Field>
        <Button type="button" className="w-full" disabled>
          Login (API not connected)
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
            Use another account
          </button>
        </FieldDescription>
      </Field>
    </FieldGroup>
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
                <FormLabel>UserName</FormLabel>
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
                <FormLabel>Confirm Password</FormLabel>
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
                <FormLabel>Nickname (optional)</FormLabel>
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
                <FormLabel>Email (optional)</FormLabel>
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
                  <Label htmlFor="terms-register">Terms of Service and Privacy Policy.</Label>
                </span>
              </FieldDescription>
            </Field>
          )}
          <Field>
            <Button type="submit" className="w-full" loading={isRegisterPending}>
              Sign up <ArrowRight />
            </Button>
            <FieldDescription className="text-center">
              Already have an account?{" "}
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => setPage(PageEnum.ACCOUNT_INPUT)}
              >
                Login
              </button>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </Form>
  );

  const titleConfig = FormTitle[page] ?? FormTitle[PageEnum.ACCOUNT_INPUT];

  return (
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
  );
}
