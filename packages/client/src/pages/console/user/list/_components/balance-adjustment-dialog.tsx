import { useI18n } from "@buildingai/i18n";
import {
  type UpdateUserBalanceDto,
  useChangeUserBalanceMutation,
  type User,
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
import { Separator } from "@buildingai/ui/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Zap } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
  action: z.enum(["1", "0"]),
  amount: z
    .number()
    .optional()
    .refine((value) => value !== undefined, "user.dialog.balanceAdjustment.amount.required")
    .refine(
      (value) => value === undefined || value >= 1,
      "user.dialog.balanceAdjustment.amount.mustBePositive",
    ),
});

type FormValues = z.infer<typeof formSchema>;

type BalanceAdjustmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess?: () => void;
};

export const BalanceAdjustmentDialog = ({
  open,
  onOpenChange,
  user,
  onSuccess,
}: BalanceAdjustmentDialogProps) => {
  const { t } = useI18n();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      action: "1",
      amount: undefined,
    },
  });

  const watchAction = form.watch("action");
  const watchAmount = form.watch("amount");

  const previewBalance = useMemo(() => {
    const currentBalance = user?.power ?? 0;
    const amount = watchAmount || 0;
    if (watchAction === "1") {
      return currentBalance + amount;
    }
    return Math.max(0, currentBalance - amount);
  }, [user?.power, watchAction, watchAmount]);

  useEffect(() => {
    if (open && user) {
      form.reset({
        action: "1",
        amount: undefined,
      });
    }
  }, [open, user, form]);

  const adjustmentMutation = useChangeUserBalanceMutation({
    onSuccess: () => {
      toast.success(t("user.dialog.balanceAdjustment.success"));
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(t("user.dialog.balanceAdjustment.failed", { message: error.message }));
    },
  });

  const handleSubmit = (values: FormValues) => {
    if (!user) return;

    const dto: UpdateUserBalanceDto = {
      action: Number(values.action) as 0 | 1,
      amount: values.amount as number,
    };

    adjustmentMutation.mutate({ id: user.id, dto });
  };

  const isPending = adjustmentMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full md:max-w-md">
        <DialogHeader className="px-1">
          <DialogTitle className="text-lg">{t("user.dialog.balanceAdjustment.title")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 px-1">
            <div className="bg-muted/50 flex items-center justify-between rounded-lg border px-4 py-3">
              <span className="text-muted-foreground text-sm">
                {t("user.dialog.balanceAdjustment.currentBalance")}
              </span>
              <div className="flex items-center gap-1.5">
                <Zap className="text-primary size-5" />
                <span className="text-foreground text-xl font-bold tabular-nums">
                  {user?.power?.toLocaleString() ?? 0}
                </span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    {t("user.dialog.balanceAdjustment.action.label")}
                  </FormLabel>
                  <FormControl>
                    <Tabs
                      value={field.value ?? "1"}
                      onValueChange={(v) => field.onChange(v)}
                      className="w-full"
                    >
                      <TabsList className="w-full">
                        <TabsTrigger value="1">
                          {t("user.dialog.balanceAdjustment.action.add")}
                        </TabsTrigger>
                        <TabsTrigger value="0">
                          {t("user.dialog.balanceAdjustment.action.subtract")}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    {watchAction === "1"
                      ? t("user.dialog.balanceAdjustment.amount.addLabel")
                      : t("user.dialog.balanceAdjustment.amount.subtractLabel")}
                  </FormLabel>
                  <FormControl>
                    <InputGroup className="w-full">
                      <InputGroupInput
                        type="number"
                        min={1}
                        placeholder={t("user.dialog.balanceAdjustment.amount.placeholder")}
                        value={field.value ?? ""}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                        }
                      />
                      <InputGroupAddon align="inline-end">
                        {t("user.listPage.credits")}
                      </InputGroupAddon>
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="border-border border-t border-dashed bg-transparent data-[orientation=horizontal]:h-0" />

            <div className="flex items-center justify-between">
              <div className="text-muted-foreground text-xs">
                {t("user.dialog.balanceAdjustment.estimatedResult")}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm tabular-nums line-through">
                  {user?.power?.toLocaleString() ?? 0}
                </span>
                <div className="flex items-center gap-2">
                  <ArrowRight className="text-muted-foreground size-4" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-primary text-2xl font-bold tabular-nums">
                      {previewBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {t("user.dialog.balanceAdjustment.cancelOperation")}
              </Button>
              <Button type="submit" disabled={isPending || !watchAmount}>
                {isPending && <Loader2 className="animate-spin" />}
                {t("user.dialog.balanceAdjustment.confirmAndSubmit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
