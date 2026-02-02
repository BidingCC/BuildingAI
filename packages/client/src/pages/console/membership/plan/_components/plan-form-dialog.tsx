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

// 订阅时长: 1-月 2-季 4-年 5-终身 6-自定义
const DURATION_OPTIONS = [
  { value: 1, label: "一个月" },
  { value: 2, label: "三个月" },
  { value: 4, label: "一年" },
  { value: 5, label: "永久" },
  { value: 6, label: "自定义时长" },
] as const;

const CUSTOM_DURATION_UNITS = [
  { value: "day", label: "天" },
  { value: "month", label: "月" },
  { value: "year", label: "年" },
] as const;

const billingRowSchema = z.object({
  levelId: z.string().min(1, "请选择等级"),
  salesPrice: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .pipe(z.number().min(0, "销售价格不能为负")),
  originalPrice: z
    .union([z.number(), z.string(), z.undefined(), z.literal("")])
    .optional()
    .transform((v) =>
      v === "" || v === undefined ? undefined : typeof v === "string" ? Number(v) : v,
    ),
  label: z.string().optional(),
  status: z.boolean(),
});

const formSchema = z.object({
  name: z.string().min(1, "计划名称必须填写").max(64, "计划名称不能超过64个字符"),
  label: z.string().max(64).optional(),
  durationConfig: z.number().int().min(1).max(6),
  durationValue: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .pipe(z.number().int().min(1))
    .optional(),
  durationUnit: z.enum(["day", "month", "year"]).optional(),
  billing: z.array(billingRowSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

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
  const isEditMode = !!planId;
  const { data: planDetail } = useMembershipPlanDetailQuery(planId, { enabled: open && !!planId });
  const { data: levelsData } = useMembershipLevelListQuery(
    { page: 1, pageSize: 100 },
    { enabled: open },
  );
  const levels = levelsData?.items ?? [];

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
    if (planId && !planDetail) return; // 编辑模式下等待详情加载
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
      toast.success("计划创建成功");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const updateMutation = useUpdateMembershipPlanMutation({
    onSuccess: () => {
      toast.success("计划更新成功");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="p-4">
          <DialogTitle>{isEditMode ? "编辑计划" : "新增计划"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "修改订阅计划信息" : "添加一个新的订阅计划"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4 pt-0 pb-17">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>计划名称</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入计划名称" {...field} />
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
                    <FormLabel>标签名称</FormLabel>
                    <FormControl>
                      <Input placeholder="如：限时优惠、推荐" {...field} />
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
                    <FormLabel>订阅时长</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                        className="flex flex-wrap gap-4"
                      >
                        {DURATION_OPTIONS.map((opt) => (
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
                      {/* <FormLabel>自定义时长</FormLabel> */}
                      <FormControl>
                        <InputGroup className="w-full max-w-[200px]">
                          <InputGroupInput
                            type="number"
                            min={1}
                            placeholder="如 7"
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
                                      <SelectValue placeholder="单位" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CUSTOM_DURATION_UNITS.map((u) => (
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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>会员计费</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => append(defaultBillingRow)}
                  >
                    <Plus className="mr-1 size-4" />
                    添加等级
                  </Button>
                </div>
                <p className="text-muted-foreground text-sm">等级不可重复选择</p>
                {fields.length === 0 ? (
                  <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                    暂无计费等级，点击「添加等级」添加
                  </p>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>等级名称</TableHead>
                          <TableHead>销售价格</TableHead>
                          <TableHead>原价</TableHead>
                          <TableHead>标签</TableHead>
                          <TableHead>启用状态</TableHead>
                          <TableHead className="w-14">操作</TableHead>
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
                                          <SelectValue placeholder="选择等级" />
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
                                name={`billing.${index}.originalPrice`}
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
                                      <Input placeholder="标签" className="h-8" {...f} />
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
                  取消
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="animate-spin" />}
                  {isEditMode ? "保存" : "新增"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
