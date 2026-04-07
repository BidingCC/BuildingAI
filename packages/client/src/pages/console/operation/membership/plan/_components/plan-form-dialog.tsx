import { useI18n } from "@buildingai/i18n";
import {
  type CreatePlansDto,
  useCreateMembershipPlanMutation,
  useMembershipLevelListQuery,
  useMembershipPlanDetailQuery,
  useUpdateMembershipPlanMutation,
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@buildingai/ui/components/ui/form";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@buildingai/ui/components/ui/input-group";
import { Label } from "@buildingai/ui/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@buildingai/ui/components/ui/radio-group";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Switch } from "@buildingai/ui/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@buildingai/ui/components/ui/table";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import type { Resolver } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// Subscription duration: 1=Monthly, 2=Quarterly, 4=Yearly, 5=Lifetime, 6=Custom
const getDurationOptions = (t: (key: string) => string) =>
  [
    { value: 1, label: t("operation.membership.plan.durationLabels.1") },
    { value: 2, label: t("operation.membership.plan.durationLabels.2") },
    { value: 4, label: t("operation.membership.plan.durationLabels.4") },
    { value: 5, label: t("operation.membership.plan.durationLabels.5") },
    { value: 6, label: t("operation.membership.plan.durationLabels.6") },
  ] as const;

const getCustomDurationUnits = (t: (key: string) => string) =>
  [
    { value: "day", label: t("operation.membership.plan.unitDay") },
    { value: "month", label: t("operation.membership.plan.unitMonth") },
    { value: "year", label: t("operation.membership.plan.unitYear") },
  ] as const;

const getBillingRowSchema = (t: (key: string) => string) =>
  z.object({
    levelId: z
      .string()
      .min(1, t("operation.membership.plan.form.levelRequired") || "Please select a level"),
    salesPrice: z
      .union([z.number(), z.string()])
      .transform((v) => (typeof v === "string" ? Number(v) : v))
      .pipe(
        z
          .number()
          .min(
            0,
            t("operation.membership.plan.form.salesPriceNonNegative") ||
              "Sales price cannot be negative",
          ),
      ),
    originalPrice: z
      .union([z.number(), z.string(), z.undefined(), z.literal("")])
      .optional()
      .transform((v) =>
        v === "" || v === undefined ? undefined : typeof v === "string" ? Number(v) : v,
      ),
    label: z.string().optional(),
    status: z.boolean(),
  });

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z
      .string()
      .min(1, t("operation.membership.plan.form.nameRequired") || "Plan name is required")
      .max(
        64,
        t("operation.membership.plan.form.nameMaxLength") ||
          "Plan name cannot exceed 64 characters",
      ),
    label: z.string().max(64).optional(),
    durationConfig: z.number().int().min(1).max(6),
    durationValue: z
      .union([z.number(), z.string()])
      .transform((v) => (typeof v === "string" ? Number(v) : v))
      .pipe(z.number().int().min(1))
      .optional(),
    durationUnit: z.enum(["day", "month", "year"]).optional(),
    billing: z.array(getBillingRowSchema(t)).optional(),
  });

type FormValues = z.infer<ReturnType<typeof getFormSchema>>;

type PlanFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string | null;
  onSuccess?: () => void;
};

const defaultBillingRow = {
  levelId: "",
  salesPrice: 0,
  originalPrice: undefined as number | undefined,
  label: "",
  status: true,
};

export const PlanFormDialog = ({ open, onOpenChange, planId, onSuccess }: PlanFormDialogProps) => {
  const { t } = useI18n();
  const isEditMode = !!planId;
  const { data: planDetail } = useMembershipPlanDetailQuery(planId, { enabled: open && !!planId });
  const { data: levelsData } = useMembershipLevelListQuery(
    { page: 1, pageSize: 100 },
    { enabled: open },
  );
  const levels = levelsData?.items ?? [];

  const formSchema = useMemo(() => getFormSchema(t), [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      name: "",
      label: "",
      durationConfig: 1,
      durationValue: undefined,
      durationUnit: "month",
      billing: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "billing",
  });

  const selectedLevelIds =
    form
      .watch("billing")
      ?.map((b) => b.levelId)
      .filter(Boolean) ?? [];
  const availableLevelsForRow = useMemo(() => {
    return (rowIndex: number) => {
      const currentLevelId = form.getValues(`billing.${rowIndex}.levelId`);
      return levels.filter((l) => !selectedLevelIds.includes(l.id) || l.id === currentLevelId);
    };
  }, [levels, selectedLevelIds, form]);

  useEffect(() => {
    if (!open) return;
    if (planId && !planDetail) return; // Wait for detail to load in edit mode
    if (planDetail) {
      form.reset({
        name: planDetail.name,
        label: planDetail.label ?? "",
        durationConfig: planDetail.durationConfig,
        durationValue: planDetail.duration?.value,
        durationUnit: (planDetail.duration?.unit as "day" | "month" | "year") ?? "month",
        billing:
          (planDetail.billing?.length ?? 0) > 0
            ? planDetail.billing!.map((b) => ({
                levelId: b.levelId,
                salesPrice: b.salesPrice,
                originalPrice: b.originalPrice,
                label: b.label ?? "",
                status: b.status,
              }))
            : [],
      });
    } else {
      form.reset({
        name: "",
        label: "",
        durationConfig: 1,
        durationValue: undefined,
        durationUnit: "month",
        billing: [],
      });
    }
  }, [open, planId, planDetail, form]);

  const createMutation = useCreateMembershipPlanMutation({
    onSuccess: () => {
      toast.success(t("operation.membership.plan.planCreated"));
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(t("operation.membership.plan.createFailed", { error: error.message }));
    },
  });

  const updateMutation = useUpdateMembershipPlanMutation({
    onSuccess: () => {
      toast.success(t("operation.membership.plan.planUpdated"));
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(t("operation.membership.plan.updateFailed", { error: error.message }));
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (values: FormValues) => {
    const durationConfig = values.durationConfig;
    const duration =
      durationConfig === 6 && values.durationValue != null && values.durationUnit
        ? { value: values.durationValue, unit: values.durationUnit }
        : undefined;

    const billing = values.billing
      ?.filter((b) => b.levelId)
      ?.map((b) => ({
        levelId: b.levelId,
        salesPrice: b.salesPrice,
        originalPrice: b.originalPrice,
        label: b.label || undefined,
        status: b.status,
      }));

    const body: CreatePlansDto = {
      name: values.name,
      label: values.label || undefined,
      durationConfig,
      duration,
      billing,
    };

    if (isEditMode && planId) {
      updateMutation.mutate({ id: planId, body });
    } else {
      createMutation.mutate(body);
    }
  };

  const durationConfig = form.watch("durationConfig");
  const isCustomDuration = durationConfig === 6;
  const durationOptions = getDurationOptions(t);
  const customDurationUnits = getCustomDurationUnits(t);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full gap-0 p-0 md:max-w-2xl">
        <DialogHeader className="p-4">
          <DialogTitle>
            {isEditMode
              ? t("operation.membership.plan.edit")
              : t("operation.membership.plan.form.addPlan")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("operation.membership.plan.form.editPlanDesc")
              : t("operation.membership.plan.form.addPlanDesc")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea
          className="max-h-[80vh] w-full overflow-hidden"
          viewportClassName="[&>div]:block!"
        >
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="w-full space-y-4 p-4 pt-0 pb-17"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("operation.membership.plan.form.name")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("operation.membership.plan.form.namePlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("operation.membership.plan.form.label")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("operation.membership.plan.form.labelPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="durationConfig"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("operation.membership.plan.form.subscriptionDuration")}
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                        className="flex flex-wrap gap-4"
                      >
                        {durationOptions.map((opt) => (
                          <div key={opt.value} className="flex items-center gap-2">
                            <RadioGroupItem
                              value={String(opt.value)}
                              id={`duration-${opt.value}`}
                            />
                            <Label
                              htmlFor={`duration-${opt.value}`}
                              className="cursor-pointer font-normal"
                            >
                              {opt.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isCustomDuration && (
                <FormField
                  control={form.control}
                  name="durationValue"
                  render={({ field: valueField }) => (
                    <FormItem>
                      <FormControl>
                        <InputGroup className="w-full max-w-[200px]">
                          <InputGroupInput
                            type="number"
                            min={1}
                            placeholder={t("operation.membership.plan.durationLabels.6")}
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
                            name="durationUnit"
                            render={({ field: unitField }) => (
                              <FormControl>
                                <InputGroupAddon align="inline-end" className="pr-1">
                                  <Select
                                    value={unitField.value}
                                    onValueChange={unitField.onChange}
                                  >
                                    <SelectTrigger className="text-muted-foreground h-8 min-w-[72px] border-0 bg-transparent shadow-none focus-visible:ring-0">
                                      <SelectValue
                                        placeholder={t("operation.membership.plan.form.unit")}
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {customDurationUnits.map((u) => (
                                        <SelectItem key={u.value} value={u.value}>
                                          {u.label}
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

              <div className="w-full space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>{t("operation.membership.plan.form.billing")}</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => append(defaultBillingRow)}
                  >
                    <Plus className="mr-1 size-4" />
                    {t("operation.membership.plan.form.addLevel")}
                  </Button>
                </div>
                <p className="text-muted-foreground text-sm">
                  {t("operation.membership.plan.form.levelCannotRepeat")}
                </p>
                {fields.length === 0 ? (
                  <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                    {t("operation.membership.plan.form.noBillingLevels")}
                  </p>
                ) : (
                  <div className="w-full rounded-lg border">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="min-w-48">
                            {t("operation.membership.plan.form.levelName")}
                          </TableHead>
                          <TableHead className="min-w-24">
                            {t("operation.membership.plan.form.salesPrice")}
                          </TableHead>
                          <TableHead className="min-w-24">
                            {t("operation.membership.plan.form.tag")}
                          </TableHead>
                          <TableHead className="min-w-24">
                            {t("operation.membership.plan.form.enabledStatus")}
                          </TableHead>
                          <TableHead className="w-14">
                            {t("operation.membership.plan.table.actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.map((field, index) => (
                          <TableRow key={field.id}>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`billing.${index}.levelId`}
                                render={({ field: levelField }) => (
                                  <FormItem>
                                    <Select
                                      value={levelField.value}
                                      onValueChange={levelField.onChange}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="h-8">
                                          <SelectValue
                                            placeholder={t(
                                              "operation.membership.plan.form.levelPlaceholder",
                                            )}
                                          />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {availableLevelsForRow(index).map((level) => (
                                          <SelectItem key={level.id} value={level.id}>
                                            {level.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`billing.${index}.salesPrice`}
                                render={({ field: f }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        className="h-8"
                                        {...f}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`billing.${index}.label`}
                                render={({ field: f }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        placeholder={t("operation.membership.plan.form.tag")}
                                        className="h-8"
                                        {...f}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`billing.${index}.status`}
                                render={({ field: f }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Switch checked={f.value} onCheckedChange={f.onChange} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive size-8"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <DialogFooter className="bg-background absolute bottom-0 left-0 w-full flex-row justify-end rounded-lg p-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t("operation.membership.plan.form.cancel")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="animate-spin" />}
                  {isEditMode
                    ? t("operation.membership.plan.form.save")
                    : t("operation.membership.plan.form.create")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
