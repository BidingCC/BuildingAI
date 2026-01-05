import { useLoginMutation } from "@buildingai/services/web";
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
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog.tsx";
import { cn } from "@buildingai/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import SvgIcons from "../../../components/svg-icons";

const PageEnum = {
  IDLE: "idle",
  PASSWORD: "password",
  WEIXIN: "weixin",
  LOGIN: "login",
  REGISTER: "register",
  RESET_PASSWORD: "reset-password",
};

const SubmitButtonText = {
  [PageEnum.IDLE]: "Next",
  [PageEnum.PASSWORD]: "Login",
};

const FormTitle = {
  [PageEnum.IDLE]: {
    title: "Welcome back",
    description: "Login with your Wechat or Google account",
  },
  [PageEnum.PASSWORD]: {
    title: "Welcome back",
    description: "Login with your Wechat or Google account",
  },
  [PageEnum.WEIXIN]: {
    title: "Login with Wechat",
    description: "Login with your Wechat account",
  },
};

const loginFormSchema = z.object({
  username: z.string().min(1, { message: "请输入用户名或邮箱" }),
  password: z.string().min(6, { message: "密码至少6位" }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [page, setPage] = useState(PageEnum.PASSWORD);
  const { confirm } = useAlertDialog();
  const { setToken } = useAuthStore((state) => state.authActions);
  const { websiteConfig } = useConfigStore((state) => state.config);
  const [agree, setAgree] = useState<boolean>(false);
  const [wechatDialogOpen, setWechatDialogOpen] = useState(false);
  const navigate = useNavigate();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const { mutateAsync: login, isPending } = useLoginMutation({
    username: form.getValues("username"),
    password: form.getValues("password"),
    terminal: 1,
  });

  const ensureAgreed = async () => {
    if (agree) return true;
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
        onConfirm: () => {
          setAgree(true);
        },
      });
      return true;
    } catch {
      return false;
    }
  };

  const handleWechatLogin = async () => {
    const agreed = await ensureAgreed();
    if (agreed) {
      setWechatDialogOpen(true);
    }
  };

  const onSubmit = async (values: LoginFormValues) => {
    const agreed = await ensureAgreed();
    if (!agreed) return;

    const data = await login({
      username: values.username,
      password: values.password,
      terminal: 1,
    });
    setToken(data.token);
    navigate("/console/dashboard");
  };

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{FormTitle[page].title}</CardTitle>
          <CardDescription>{FormTitle[page].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup className="gap-5">
                <Field>
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

                  <Button variant="secondary" type="button">
                    <SvgIcons.google />
                    Login with Google
                  </Button>
                </Field>
                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                  Or continue with
                </FieldSeparator>
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email / UserName</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="m@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {page === PageEnum.PASSWORD && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center">
                          <FormLabel>Password</FormLabel>
                          <a
                            href="#"
                            className="ml-auto text-sm underline-offset-4 hover:underline"
                          >
                            Forgot your password?
                          </a>
                        </div>
                        <FormControl>
                          <Input type="password" autoComplete="current-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <Field>
                  <FieldDescription>
                    <span className="flex items-center gap-3">
                      <Checkbox
                        checked={agree}
                        onCheckedChange={(e) => setAgree(e as boolean)}
                        id="terms"
                      />
                      <Label htmlFor="terms">Terms of Service and Privacy Policy.</Label>
                    </span>
                  </FieldDescription>
                </Field>

                <Field>
                  <Button type="submit" className="w-full" loading={isPending}>
                    {SubmitButtonText[page]} <ArrowRight />
                  </Button>

                  <FieldDescription className="text-center">
                    Don&apos;t have an account? <a href="#">Sign up</a>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
