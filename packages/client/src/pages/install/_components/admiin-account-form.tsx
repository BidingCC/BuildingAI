import { useI18n } from "@buildingai/i18n";
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
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const createFormSchema = (t: (key: string) => string) =>
  z
    .object({
      username: z.string().min(2, {
        message: t("install.adminAccount.usernameMinLength"),
      }),
      password: z.string().min(6, {
        message: t("install.adminAccount.passwordMinLength"),
      }),
      confirmPassword: z.string().min(6, {
        message: t("install.adminAccount.confirmPasswordMinLength"),
      }),
      email: z
        .email({ message: t("install.adminAccount.emailInvalid") })
        .optional()
        .or(z.literal("")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("install.adminAccount.passwordMismatch"),
      path: ["confirmPassword"],
    });

export type AdminAccountFormValues = z.infer<ReturnType<typeof createFormSchema>>;

interface AdminAccountFormProps {
  step: number;
  defaultValues?: Partial<AdminAccountFormValues>;
  onChange?: (values: AdminAccountFormValues, isValid: boolean) => void;
}

const AdminAccountForm = ({ step, defaultValues, onChange }: AdminAccountFormProps) => {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);

  const form = useForm<AdminAccountFormValues>({
    resolver: zodResolver(createFormSchema(t)),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      ...defaultValues,
    },
    mode: "onChange",
  });

  // Handle fade-in effect when step becomes 1
  useEffect(() => {
    if (step === 1) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [step]);

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
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center transition-all delay-500 duration-1000 ease-in-out",
        {
          "translate-y-4 opacity-0": !isVisible,
          "translate-y-0 opacity-100": isVisible,
          hidden: step !== 1,
        },
      )}
    >
      <Form {...form}>
        <form className="h-fit w-xs space-y-6">
          <h1 className="text-xl font-bold">{t("install.adminAccount.createAdmin")}</h1>
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("install.adminAccount.username")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("install.adminAccount.usernamePlaceholder")}
                    required
                    {...field}
                    autoComplete="off"
                  />
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
                <FormLabel required>{t("install.adminAccount.password")}</FormLabel>
                <FormControl>
                  <PasswordInput
                    required
                    placeholder={t("install.adminAccount.passwordPlaceholder")}
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
                <FormLabel required>{t("install.adminAccount.confirmPassword")}</FormLabel>
                <FormControl>
                  <PasswordInput
                    required
                    placeholder={t("install.adminAccount.confirmPasswordPlaceholder")}
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
                <FormLabel>{t("install.adminAccount.email")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("install.adminAccount.emailPlaceholder")}
                    {...field}
                    autoComplete="off"
                  />
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
