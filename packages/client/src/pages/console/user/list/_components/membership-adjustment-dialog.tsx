import { useI18n } from "@buildingai/i18n";
import {
  type SystemAdjustmentDto,
  useMembershipLevelListQuery,
  type User,
  useSystemAdjustmentMembershipMutation,
} from "@buildingai/services/console";
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
import { RadioGroup, RadioGroupItem } from "@buildingai/ui/components/ui/radio-group";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { cn } from "@buildingai/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const CUSTOM_DURATION_UNITS = [
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
] as const;

const formSchema = z
  .object({
    levelId: z.string().nullable(),
    durationType: z.enum(["1", "3", "12", "forever", "custom"]),
    customValue: z.number().optional(),
    customUnit: z.enum(["day", "month", "year"]).optional(),
  })
  .refine(
    (data) => {
      if (data.durationType === "custom") {
        return !!data.customValue && !!data.customUnit;
      }
      return true;
    },
    {
      message: "user.dialog.membershipAdjustment.duration.customRequired",
      path: ["customValue"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

type MembershipAdjustmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess?: () => void;
};

const DURATION_OPTIONS = [
  { value: "1", label: "1 month" },
  { value: "3", label: "3 months" },
  { value: "12", label: "Half year" },
  { value: "forever", label: "Forever" },
  { value: "custom", label: "Custom" },
] as const;

/**
 * Membership adjustment dialog component
 */
export const MembershipAdjustmentDialog = ({
  open,
  onOpenChange,
  user,
  onSuccess,
}: MembershipAdjustmentDialogProps) => {
  const { t } = useI18n();
  const { data: levelsData, isLoading: isLoadingLevels } = useMembershipLevelListQuery(
    {
      pageSize: 100,
      status: "true",
    },
    { enabled: open },
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      levelId: null,
      durationType: "1",
      customValue: undefined,
      customUnit: "month",
    },
  });

  const watchDurationType = form.watch("durationType");
  const watchLevelId = form.watch("levelId");

  useEffect(() => {
    if (open && user) {
      form.reset({
        levelId: user.membershipLevel?.id ?? null,
        durationType: "1",
        customValue: undefined,
        customUnit: "month",
      });
    }
  }, [open, user, form]);

  const adjustmentMutation = useSystemAdjustmentMembershipMutation({
    onSuccess: (data) => {
      toast.success(
        t("user.dialog.membershipAdjustment.adjustmentSuccess", { message: data.message }),
      );
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(
        t("user.dialog.membershipAdjustment.adjustmentFailed", { message: error.message }),
      );
    },
  });

  const handleSubmit = (values: FormValues) => {
    if (!user) return;

    const dto: SystemAdjustmentDto = {
      userId: user.id,
      levelId: values.levelId,
      durationType: values.durationType,
      customValue: values.customValue,
      customUnit: values.customUnit,
    };

    adjustmentMutation.mutate(dto);
  };

  const isPending = adjustmentMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full md:max-w-md">
        <DialogHeader className="px-1">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {t("user.dialog.membershipAdjustment.title")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-1.5 text-sm">
            {t("user.dialog.membershipAdjustment.description", { username: user?.username })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="max-h-[70vh] space-y-4 px-1"
            >
              <FormField
                control={form.control}
                name="levelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">
                      {t("user.dialog.membershipAdjustment.level.label")}
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={field.value || "null"}
                        onValueChange={(v) => field.onChange(v === "null" ? null : v)}
                      >
                        <SelectTrigger className="h-12 w-full">
                          <SelectValue
                            placeholder={t("user.dialog.membershipAdjustment.level.placeholder")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="null">
                            <div className="flex items-center gap-2">
                              <span>{t("user.dialog.membershipAdjustment.level.regularUser")}</span>
                            </div>
                          </SelectItem>
                          {isLoadingLevels ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="text-muted-foreground size-4 animate-spin" />
                            </div>
                          ) : (
                            levelsData?.items?.map((level) => (
                              <SelectItem key={level.id} value={level.id}>
                                <div className="flex items-center gap-2">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{level.name}</span>
                                  </div>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription className="text-muted-foreground text-xs">
                      {t("user.dialog.membershipAdjustment.level.description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchLevelId && (
                <FormField
                  control={form.control}
                  name="durationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">
                        {t("user.dialog.membershipAdjustment.duration.label")}
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="grid grid-cols-2 gap-3 md:grid-cols-3"
                        >
                          {DURATION_OPTIONS.map((option) => (
                            <label
                              key={option.value}
                              className={cn(
                                "border-input hover:border-primary relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-4",
                                field.value === option.value &&
                                  "border-primary bg-primary/5 ring-primary/20 ring-2",
                              )}
                            >
                              <RadioGroupItem
                                value={option.value}
                                className="absolute top-2 right-2"
                              />
                              <div className="text-foreground text-base font-semibold">
                                {option.label}
                              </div>
                            </label>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* 自定义时长输入 */}
              {watchLevelId && watchDurationType === "custom" && (
                <FormField
                  control={form.control}
                  name="customValue"
                  render={({ field: valueField }) => (
                    <FormItem>
                      {/* <FormLabel>自定义时长</FormLabel> */}
                      <FormControl>
                        <InputGroup className="w-full">
                          <InputGroupInput
                            type="number"
                            min={1}
                            placeholder={t(
                              "user.dialog.membershipAdjustment.duration.customValuePlaceholder",
                            )}
                            value={valueField.value ?? ""}
                            onBlur={valueField.onBlur}
                            ref={valueField.ref}
                            onChange={(e) =>
                              valueField.onChange(
                                e.target.value === "" ? undefined : Number(e.target.value),
                              )
                            }
                          />
                          <FormField
                            control={form.control}
                            name="customUnit"
                            render={({ field: unitField }) => (
                              <FormControl>
                                <InputGroupAddon align="inline-end" className="pr-1">
                                  <Select
                                    value={unitField.value}
                                    onValueChange={unitField.onChange}
                                  >
                                    <SelectTrigger className="text-muted-foreground h-8 min-w-[72px] border-0 bg-transparent shadow-none focus-visible:ring-0">
                                      <SelectValue
                                        placeholder={t(
                                          "user.dialog.membershipAdjustment.duration.unit",
                                        )}
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CUSTOM_DURATION_UNITS.map((u) => (
                                        <SelectItem key={u.value} value={u.value}>
                                          {t(
                                            `user.dialog.membershipAdjustment.duration.${u.value}`,
                                          )}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </InputGroupAddon>
                              </FormControl>
                            )}
                          />
                        </InputGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t("user.dialog.membershipAdjustment.cancel")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="animate-spin" />}
                  {t("user.dialog.membershipAdjustment.confirm")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
