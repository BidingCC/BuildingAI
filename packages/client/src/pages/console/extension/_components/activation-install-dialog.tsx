import {
  type Extension,
  useGetApplicationByActivationCodeMutation,
  useInstallByActivationCodeMutation,
} from "@buildingai/services/console";
import { AspectRatio } from "@buildingai/ui/components/ui/aspect-ratio";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@buildingai/ui/components/ui/form";
import { Input } from "@buildingai/ui/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useI18n } from "@buildingai/i18n";

const formSchema = z.object({
  activationKey: z
    .string({ message: "Please enter activation code" })
    .min(1, "Activation code is required")
    .regex(/^[A-Z0-9]+$/, "Activation code format is incorrect"),
});

type FormValues = z.infer<typeof formSchema>;

type ActivationInstallDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

/**
 * Activation code install dialog component
 */
export const ActivationInstallDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: ActivationInstallDialogProps) => {
  const { t } = useI18n();
  const [step, setStep] = useState<"input" | "confirm">("input");
  const [extensionInfo, setExtensionInfo] = useState<Extension | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      activationKey: "",
    },
  });

  const verifyMutation = useGetApplicationByActivationCodeMutation();

  const installMutation = useInstallByActivationCodeMutation({
    onSuccess: () => {
      toast.success(t("extension.activation.installSuccess"));
      handleClose();
      onSuccess?.();
    },
  });

  /**
   * Verify activation code and get extension details
   */
  const handleVerifyActivationKey = async (values: FormValues) => {
    try {
      const code = values.activationKey;
      const extension = await verifyMutation.mutateAsync(code);
      if (extension) {
        setExtensionInfo(extension);
        setStep("confirm");
        toast.success(t("extension.activation.verifySuccess"));
      }
    } catch (error: any) {
      console.log(`Verification failed: ${error.message || "Invalid activation code"}`);
    }
  };

  /**
   * Confirm installation
   */
  const handleInstall = () => {
    if (!form.getValues("activationKey")) {
      toast.error(t("extension.activation.installFailedNoCode"));
      setStep("input");
      return;
    }
    if (!extensionInfo?.key) {
      toast.error(t("extension.activation.installFailedNoIdentifier"));
      setStep("input");
      return;
    }
    installMutation.mutate({
      activationCode: form.getValues("activationKey"),
      identifier: extensionInfo.key,
    });
  };

  /**
   * Close dialog and reset state
   */
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("input");
      setExtensionInfo(null);
      form.reset();
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:w-lg">
        {step === "input" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {t("extension.activation.title")}
              </DialogTitle>
              <DialogDescription>{t("extension.activation.description")}</DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleVerifyActivationKey)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="activationKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder={t("extension.activation.placeholder")}
                          className="font-mono text-base tracking-widest"
                          autoComplete="off"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase();
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    {t("extension.activation.cancel")}
                  </Button>
                  <Button type="submit" disabled={verifyMutation.isPending}>
                    {verifyMutation.isPending && <Loader2 className="animate-spin" />}
                    {t("extension.activation.redeem")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader className="items-center space-y-4">
              {/* Cover image */}
              <div className="relative w-full">
                <AspectRatio ratio={16 / 9} className="w-full overflow-hidden rounded-lg">
                  <img
                    src={extensionInfo?.cover}
                    alt={extensionInfo?.name}
                    className="h-full w-full object-cover"
                  />
                </AspectRatio>

                {/* App icon */}
                <div className="bg-muted absolute -bottom-8 left-1/2 flex size-16 -translate-x-1/2 items-center justify-center rounded-lg shadow-lg">
                  <img
                    src={extensionInfo?.icon}
                    alt={extensionInfo?.name}
                    className="size-14 rounded-full object-cover"
                  />
                </div>
              </div>

              <div className="mt-8 text-center">
                <DialogTitle className="text-2xl font-bold">{extensionInfo?.name}</DialogTitle>
              </div>
            </DialogHeader>

            <DialogDescription className="line-clamp-5 text-center leading-relaxed">
              {extensionInfo?.describe}
            </DialogDescription>

            <DialogFooter className="flex-col gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep("input")}>
                {t("extension.activation.back")}
              </Button>
              <Button onClick={handleInstall} disabled={installMutation.isPending} size="lg">
                {installMutation.isPending && <Loader2 className="animate-spin" />}
                <Download />
                {t("extension.activation.startDeploy")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
