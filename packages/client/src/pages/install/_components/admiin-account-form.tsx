import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@buildingai/ui/components/ui/form";
import { Input, PasswordInput } from "@buildingai/ui/components/ui/input";
import { cn } from "@buildingai/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z
  .object({
    username: z.string().min(2, {
      message: "用户名至少需要2个字符",
    }),
    password: z.string().min(6, {
      message: "密码至少需要6个字符",
    }),
    confirmPassword: z.string().min(6, {
      message: "确认密码至少需要6个字符",
    }),
    email: z.email({ message: "请输入有效的邮箱地址" }).optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

export type AdminAccountFormValues = z.infer<typeof formSchema>;

interface AdminAccountFormProps {
  step: number;
  defaultValues?: Partial<AdminAccountFormValues>;
  onChange?: (values: AdminAccountFormValues, isValid: boolean) => void;
}

const AdminAccountForm = ({ step, defaultValues, onChange }: AdminAccountFormProps) => {
  const form = useForm<AdminAccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      ...defaultValues,
    },
    mode: "onChange",
  });

  useEffect(() => {
    const subscription = form.watch(async (_value, { name }) => {
      if (!name) return;
      await form.trigger(name);
      const isValid = form.formState.isValid;
      const values = form.getValues();
      onChange?.(values, isValid);
    });
    return () => subscription.unsubscribe();
  }, [form, onChange]);

  return (
    <div className={cn("flex justify-center", { hidden: step !== 1 })}>
      <Form {...form}>
        <form className="w-xs space-y-6">
          <h1 className="text-xl font-bold">创建管理员账号</h1>
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="username" required {...field} autoComplete="off" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    required
                    placeholder="password"
                    type="password"
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    required
                    placeholder="confirm password"
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="email" {...field} autoComplete="off" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
};

export default AdminAccountForm;
