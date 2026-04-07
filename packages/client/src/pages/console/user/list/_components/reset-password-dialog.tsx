import { useI18n } from "@buildingai/i18n";
import {
  useResetPasswordAutoMutation,
  useResetPasswordMutation,
} from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@buildingai/ui/components/ui/form";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@buildingai/ui/components/ui/input-group";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Eye, EyeClosed, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z
  .object({
    password: z
      .string({ message: "user.dialog.resetPassword.newPassword.required" })
      .min(6, "user.dialog.resetPassword.newPassword.minLength"),
    confirmPassword: z.string({ message: "user.dialog.resetPassword.confirmPassword.required" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "user.dialog.resetPassword.confirmPassword.mismatch",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

type ResetPasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  nickname: string | null;
  onSuccess?: () => void;
};

/**
 * Reset password dialog component
 */
export const ResetPasswordDialog = ({
  open,
  onOpenChange,
  userId,
  nickname,
  onSuccess,
}: ResetPasswordDialogProps) => {
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { confirm } = useAlertDialog();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const resetPasswordMutation = useResetPasswordMutation({
    onSuccess: () => {
      toast.success(t("user.dialog.resetPassword.resetSuccess"));
      onOpenChange(false);
      form.reset();
      setGeneratedPassword(null);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(t("user.dialog.resetPassword.resetFailed", { message: error.message }));
    },
  });

  const resetPasswordAutoMutation = useResetPasswordAutoMutation({
    onSuccess: (data) => {
      setGeneratedPassword(data.password);
      form.setValue("password", data.password);
      form.setValue("confirmPassword", data.password);
      toast.success(t("user.dialog.resetPassword.generateSuccess"));
    },
    onError: (error) => {
      toast.error(t("user.dialog.resetPassword.generateFailed", { message: error.message }));
    },
    onSettled: () => {
      setIsGenerating(false);
    },
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setGeneratedPassword(null);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setIsGenerating(false);
    }
    onOpenChange(open);
  };

  const handleSubmit = (values: FormValues) => {
    resetPasswordMutation.mutate({
      id: userId,
      password: values.password,
    });
  };

  const handleGeneratePassword = async () => {
    await confirm({
      title: t("user.dialog.resetPassword.randomGenerateTitle"),
      description: t("user.dialog.resetPassword.randomGenerateConfirm", {
        nickname: nickname || "",
      }),
    });
    setIsGenerating(true);
    resetPasswordAutoMutation.mutate(userId);
  };

  const handleCopyPassword = async () => {
    const password = form.getValues("password");
    if (!password) {
      toast.error(t("user.dialog.resetPassword.pleaseGenerateOrInput"));
      return;
    }
    try {
      await navigator.clipboard.writeText(password);
      toast.success(t("user.dialog.resetPassword.copiedToClipboard"));
    } catch {
      toast.error(t("user.dialog.resetPassword.copyFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t("user.dialog.resetPassword.title")}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-primary h-auto p-0 text-sm font-normal hover:bg-transparent"
              onClick={handleGeneratePassword}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="mr-1 size-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1 size-3.5" />
              )}
              {isGenerating
                ? t("user.dialog.resetPassword.generating")
                : t("user.dialog.resetPassword.generateRandom")}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {generatedPassword ? (
              <div className="space-y-4">
                <FormItem>
                  <FormLabel>{t("user.dialog.resetPassword.generatedPassword")}</FormLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="new-password-input"
                      type="text"
                      placeholder={t("user.dialog.resetPassword.newPassword.placeholder")}
                      disabled
                      value={generatedPassword}
                    />
                    <InputGroupAddon
                      align="inline-end"
                      onClick={handleCopyPassword}
                      className="hover:bg-muted/50 cursor-pointer rounded-sm p-1 transition-colors"
                    >
                      <Copy className="size-4" />
                    </InputGroupAddon>
                  </InputGroup>
                </FormItem>
              </div>
            ) : (
              // 显示密码输入框
              <>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <span className="text-destructive">*</span>
                        {t("user.dialog.resetPassword.newPassword.label")}
                      </FormLabel>
                      <FormControl>
                        <InputGroup>
                          <InputGroupInput
                            id="new-password-input"
                            type={showPassword ? "text" : "password"}
                            placeholder={t("user.dialog.resetPassword.newPassword.placeholder")}
                            {...field}
                          />
                          <InputGroupAddon
                            align="inline-end"
                            onClick={() => setShowPassword(!showPassword)}
                            className="hover:bg-muted/50 cursor-pointer rounded-sm p-1 transition-colors"
                          >
                            {showPassword ? (
                              <EyeClosed className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </InputGroupAddon>
                        </InputGroup>
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
                      <FormLabel>
                        <span className="text-destructive">*</span>
                        {t("user.dialog.resetPassword.confirmPassword.label")}
                      </FormLabel>
                      <FormControl>
                        <InputGroup>
                          <InputGroupInput
                            id="confirm-password-input"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder={t("user.dialog.resetPassword.confirmPassword.placeholder")}
                            {...field}
                          />
                          <InputGroupAddon
                            align="inline-end"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="hover:bg-muted/50 cursor-pointer rounded-sm p-1 transition-colors"
                          >
                            {showConfirmPassword ? (
                              <EyeClosed className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </InputGroupAddon>
                        </InputGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormDescription className="text-muted-foreground text-xs">
                  {t("user.dialog.resetPassword.passwordHint")}
                </FormDescription>
              </>
            )}

            <DialogFooter className="gap-2">
              {!generatedPassword && (
                <>
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                    {t("user.dialog.resetPassword.cancel")}
                  </Button>
                  <Button type="submit" disabled={resetPasswordMutation.isPending}>
                    {resetPasswordMutation.isPending && <Loader2 className="animate-spin" />}
                    {t("user.dialog.resetPassword.confirmReset")}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
