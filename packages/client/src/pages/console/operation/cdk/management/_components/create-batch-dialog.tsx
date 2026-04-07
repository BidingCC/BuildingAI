import { useI18n } from "@buildingai/i18n";
import {
  CardRedeemType,
  type CreateCardBatchDto,
  MembershipPlanDuration,
  useCreateCardBatchMutation,
  useMembershipLevelListQuery,
  useMembershipPlansConfigQuery,
} from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import { Calendar, type Locale } from "@buildingai/ui/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@buildingai/ui/components/ui/input-group";
import { Label } from "@buildingai/ui/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { cn } from "@buildingai/ui/lib/utils";
import { format } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const DATE_FNS_LOCALE_MAP: Record<string, Locale> = {
  "en-US": enUS,
  "zh-CN": zhCN,
};

type CreateBatchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * 创建卡密批次对话框
 */
export function CreateBatchDialog({ open, onOpenChange }: CreateBatchDialogProps) {
  const { locale: currentLocale, t } = useI18n();
  const dateFnsLocale = DATE_FNS_LOCALE_MAP[currentLocale] ?? zhCN;

  const [name, setName] = useState("");
  const [redeemType, setRedeemType] = useState<CardRedeemType>(CardRedeemType.POINTS);
  const [levelId, setLevelId] = useState<string>("");
  const [membershipDuration, setMembershipDuration] = useState<MembershipPlanDuration>(
    MembershipPlanDuration.MONTH,
  );
  const [customValue, setCustomValue] = useState("");
  const [customUnit, setCustomUnit] = useState("day");
  const [pointsAmount, setPointsAmount] = useState("");
  const [expireAt, setExpireAt] = useState<Date>();
  const [totalCount, setTotalCount] = useState("");
  const [remark, setRemark] = useState("");

  const { data: membershipConfigData } = useMembershipPlansConfigQuery();
  const membershipEnabled = membershipConfigData?.plansStatus ?? false;
  const { data: levelsData } = useMembershipLevelListQuery({ pageSize: 100 });
  const createMutation = useCreateCardBatchMutation();

  useEffect(() => {
    if (!open) {
      setName("");
      setRedeemType(membershipEnabled ? CardRedeemType.MEMBERSHIP : CardRedeemType.POINTS);
      setLevelId("");
      setMembershipDuration(MembershipPlanDuration.MONTH);
      setCustomValue("");
      setCustomUnit("day");
      setPointsAmount("");
      setExpireAt(undefined);
      setTotalCount("");
      setRemark("");
    }
  }, [open, membershipEnabled]);

  useEffect(() => {
    if (!membershipEnabled && redeemType === CardRedeemType.MEMBERSHIP) {
      setRedeemType(CardRedeemType.POINTS);
      setLevelId("");
      setMembershipDuration(MembershipPlanDuration.MONTH);
      setCustomValue("");
      setCustomUnit("day");
    }
  }, [membershipEnabled, redeemType]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t("operation.cdk.management.pleaseEnterName"));
      return;
    }

    if (!expireAt) {
      toast.error(t("operation.cdk.management.pleaseSelectExpireTime"));
      return;
    }

    if (!totalCount || Number(totalCount) <= 0) {
      toast.error(t("operation.cdk.management.pleaseEnterValidCount"));
      return;
    }

    if (redeemType === CardRedeemType.MEMBERSHIP) {
      if (!membershipEnabled) {
        toast.error(t("operation.cdk.management.membershipNotEnabled"));
        return;
      }
      if (!levelId) {
        toast.error(t("operation.cdk.management.pleaseSelectLevel"));
        return;
      }
      if (
        membershipDuration === MembershipPlanDuration.CUSTOM &&
        (!customValue || Number(customValue) <= 0)
      ) {
        toast.error(t("operation.cdk.management.pleaseEnterValidDuration"));
        return;
      }
    } else if (redeemType === CardRedeemType.POINTS) {
      if (!pointsAmount || Number(pointsAmount) <= 0) {
        toast.error(t("operation.cdk.management.pleaseEnterValidPoints"));
        return;
      }
    }

    const body: CreateCardBatchDto = {
      name: name.trim(),
      redeemType,
      expireAt: expireAt.toISOString(),
      totalCount: Number(totalCount),
      remark: remark.trim() || undefined,
    };

    if (redeemType === CardRedeemType.MEMBERSHIP) {
      body.levelId = levelId;
      body.membershipDuration = membershipDuration;
      if (membershipDuration === MembershipPlanDuration.CUSTOM) {
        body.customDuration = {
          value: Number(customValue),
          unit: customUnit,
        };
      }
    } else {
      body.pointsAmount = Number(pointsAmount);
    }

    try {
      await createMutation.mutateAsync(body);
      toast.success(t("operation.cdk.management.created"));
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || t("operation.cdk.management.createFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full overflow-y-auto md:w-md">
        <DialogHeader>
          <DialogTitle>{t("operation.cdk.management.createBatch")}</DialogTitle>
          <DialogDescription>{t("operation.cdk.management.createBatchDesc")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>
              <span className="text-destructive">*</span>
              {t("operation.cdk.management.name")}
            </Label>
            <Input
              id="name"
              placeholder={t("operation.cdk.management.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>
              <span className="text-destructive">*</span>
              {t("operation.cdk.management.redeemType")}
            </Label>
            <Select
              value={String(redeemType)}
              onValueChange={(value) => setRedeemType(Number(value) as CardRedeemType)}
            >
              <SelectTrigger id="redeemType" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {membershipEnabled && (
                  <SelectItem value={String(CardRedeemType.MEMBERSHIP)}>
                    {t("operation.cdk.management.membership")}
                  </SelectItem>
                )}
                <SelectItem value={String(CardRedeemType.POINTS)}>
                  {t("operation.cdk.management.points")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {membershipEnabled && redeemType === CardRedeemType.MEMBERSHIP && (
            <>
              <div className="space-y-2">
                <Label>
                  <span className="text-destructive">*</span>
                  {t("operation.cdk.management.level")}
                </Label>
                <Select value={levelId} onValueChange={setLevelId}>
                  <SelectTrigger id="levelId" className="w-full">
                    <SelectValue placeholder={t("operation.cdk.management.levelPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {levelsData?.items?.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  <span className="text-destructive">*</span>
                  {t("operation.cdk.management.duration")}
                </Label>
                <Select
                  value={String(membershipDuration)}
                  onValueChange={(value) =>
                    setMembershipDuration(Number(value) as MembershipPlanDuration)
                  }
                >
                  <SelectTrigger id="membershipDuration" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(MembershipPlanDuration.MONTH)}>
                      {t("operation.cdk.management.durationMonth")}
                    </SelectItem>
                    <SelectItem value={String(MembershipPlanDuration.QUARTER)}>
                      {t("operation.cdk.management.durationQuarter")}
                    </SelectItem>
                    <SelectItem value={String(MembershipPlanDuration.HALF)}>
                      {t("operation.cdk.management.durationHalf")}
                    </SelectItem>
                    <SelectItem value={String(MembershipPlanDuration.YEAR)}>
                      {t("operation.cdk.management.durationYear")}
                    </SelectItem>
                    <SelectItem value={String(MembershipPlanDuration.FOREVER)}>
                      {t("operation.cdk.management.durationForever")}
                    </SelectItem>
                    <SelectItem value={String(MembershipPlanDuration.CUSTOM)}>
                      {t("operation.cdk.management.durationCustom")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {membershipDuration === MembershipPlanDuration.CUSTOM && (
                <div className="space-y-2">
                  <Label>
                    <span className="text-destructive">*</span>
                    {t("operation.cdk.management.customDuration")}
                  </Label>
                  <InputGroup className="w-full">
                    <InputGroupInput
                      type="number"
                      min={1}
                      placeholder={t("operation.cdk.management.customDurationPlaceholder")}
                      value={customValue}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCustomValue(e.target.value)
                      }
                    />
                    <InputGroupAddon align="inline-end" className="pr-1">
                      <Select value={customUnit} onValueChange={setCustomUnit}>
                        <SelectTrigger className="text-muted-foreground h-8 min-w-[72px] border-0 bg-transparent shadow-none focus-visible:ring-0">
                          <SelectValue placeholder={t("operation.cdk.management.unit")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">
                            {t("operation.cdk.management.unitDay")}
                          </SelectItem>
                          <SelectItem value="month">
                            {t("operation.cdk.management.unitMonth")}
                          </SelectItem>
                          <SelectItem value="year">
                            {t("operation.cdk.management.unitYear")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </InputGroupAddon>
                  </InputGroup>
                </div>
              )}
            </>
          )}

          {redeemType === CardRedeemType.POINTS && (
            <div className="space-y-2">
              <Label>
                <span className="text-destructive">*</span>
                {t("operation.cdk.management.pointsAmount")}
              </Label>
              <Input
                id="pointsAmount"
                type="number"
                min="1"
                placeholder={t("operation.cdk.management.pointsAmountPlaceholder")}
                value={pointsAmount}
                onChange={(e) => setPointsAmount(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>
              <span className="text-destructive">*</span>
              {t("operation.cdk.management.totalCount")}
            </Label>
            <Input
              id="totalCount"
              type="number"
              min="1"
              placeholder={t("operation.cdk.management.totalCountPlaceholder")}
              value={totalCount}
              onChange={(e) => setTotalCount(e.target.value)}
            />
          </div>

          <div
            className={cn(
              "space-y-2",
              redeemType === CardRedeemType.POINTS ||
                membershipDuration === MembershipPlanDuration.CUSTOM
                ? "sm:col-span-2"
                : "",
            )}
          >
            <Label>
              <span className="text-destructive">*</span>
              {t("operation.cdk.management.expireTime")}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !expireAt && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {expireAt ? (
                    format(expireAt, "PPP", { locale: dateFnsLocale })
                  ) : (
                    <span>{t("operation.cdk.management.selectExpireTime")}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={expireAt} onSelect={setExpireAt} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="col-span-1 space-y-2 sm:col-span-2">
            <Label htmlFor="remark">{t("operation.cdk.management.remark")}</Label>
            <Textarea
              id="remark"
              placeholder={t("operation.cdk.management.remarkPlaceholder")}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("operation.cdk.management.cancel")}
          </Button>
          <Button onClick={handleSubmit} loading={createMutation.isPending}>
            {t("operation.cdk.management.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
