import { useI18n } from "@buildingai/i18n";
import { type FinanceCenterResponse, useFinanceCenterQuery } from "@buildingai/services/console";
import { Card, CardContent, CardHeader } from "@buildingai/ui/components/ui/card";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { cn } from "@buildingai/ui/lib/utils";

import { PageContainer } from "@/layouts/console/_components/page-container";

function formatAmount(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function StatItem({
  label,
  value,
  unit,
  variant = "default",
}: {
  label: string;
  value: string;
  unit?: string;
  variant?: "default" | "muted";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(
          "text-sm tracking-wider uppercase",
          variant === "muted" ? "text-muted-foreground/80" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span className="text-foreground text-lg font-semibold tracking-tight tabular-nums">
        {value}
        {unit != null && (
          <span className="text-muted-foreground ml-1 text-sm font-normal">{unit}</span>
        )}
      </span>
    </div>
  );
}

function Block({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card size="sm" className={cn("bg-card/50", className)}>
      <CardHeader className="pb-2">
        <h3 className="text-foreground text-sm font-semibold tracking-wider uppercase">{title}</h3>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

const FinancialAnalysisIndexPage = () => {
  const { data, isLoading } = useFinanceCenterQuery();
  const { t } = useI18n();
  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer>
        <div className="text-muted-foreground flex min-h-70 items-center justify-center text-sm">
          {t("financial.analysis.noData")}
        </div>
      </PageContainer>
    );
  }

  const { finance, recharge, member, user } = data as unknown as FinanceCenterResponse;

  const pointsIssued = user.totalPointsIssued;
  const pointsConsumed = user.totalPointsConsumed;
  const pointsRemaining = user.totalPowerSum;

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="flex flex-wrap items-end justify-between gap-6 py-5">
            <div>
              <p className="text-muted-foreground mb-1 text-sm tracking-wider uppercase">
                {t("financial.analysis.totalNetIncome")}
              </p>
              <p className="text-foreground text-3xl font-semibold tracking-tight tabular-nums">
                ¥{formatAmount(finance.totalNetIncome)}
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-4 sm:gap-x-10">
              <StatItem
                label={t("financial.analysis.totalIncomeAmount")}
                value={formatAmount(finance.totalIncomeAmount)}
                variant="muted"
              />
              <StatItem
                label={t("financial.analysis.totalOrders")}
                value={formatInteger(finance.totalIncomeNum)}
                unit={t("financial.analysis.orders")}
                variant="muted"
              />
              <StatItem
                label={t("financial.analysis.totalRefundAmount")}
                value={formatAmount(finance.totalRefundAmount)}
                variant="muted"
              />
              <StatItem
                label={t("financial.analysis.totalRefundOrders")}
                value={formatInteger(finance.totalRefundNum)}
                variant="muted"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Block title={t("financial.analysis.orderOverview")}>
            <div className="space-y-5">
              <div>
                <p className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                  {t("financial.analysis.recharge")}
                </p>
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-5">
                  <StatItem
                    label={t("financial.analysis.rechargeIncome")}
                    value={formatAmount(recharge.rechargeAmount)}
                  />
                  <StatItem
                    label={t("financial.analysis.rechargeOrders")}
                    value={formatInteger(recharge.rechargeNum)}
                  />
                  <StatItem
                    label={t("financial.analysis.totalRefundAmount")}
                    value={formatAmount(recharge.rechargeRefundAmount)}
                  />
                  <StatItem
                    label={t("financial.analysis.rechargeRefundOrders")}
                    value={formatInteger(recharge.rechargeRefundNum)}
                  />
                  <StatItem
                    label={t("financial.analysis.rechargeNetIncome")}
                    value={formatAmount(recharge.rechargeNetIncome)}
                  />
                </div>
              </div>
              <div className="border-border/40 border-t pt-4">
                <p className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                  {t("financial.analysis.member")}
                </p>
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-5">
                  <StatItem
                    label={t("financial.analysis.memberIncome")}
                    value={formatAmount(member.memberAmount)}
                  />
                  <StatItem
                    label={t("financial.analysis.memberOrders")}
                    value={formatInteger(member.memberOrderNum)}
                  />
                  <StatItem
                    label={t("financial.analysis.totalRefundAmount")}
                    value={formatAmount(member.memberRefundAmount)}
                  />
                  <StatItem
                    label={t("financial.analysis.rechargeRefundOrders")}
                    value={formatInteger(member.memberRefundNum)}
                  />
                  <StatItem
                    label={t("financial.analysis.memberNetIncome")}
                    value={formatAmount(member.memberNetIncome)}
                  />
                </div>
              </div>
            </div>
          </Block>

          <Block title={t("financial.analysis.userOverview")}>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-5">
                <StatItem
                  label={t("financial.analysis.totalUsers")}
                  value={formatInteger(user.totalUserNum)}
                />
                <StatItem
                  label={t("financial.analysis.totalRechargeUsers")}
                  value={formatInteger(user.totalRechargeNum)}
                />
                <StatItem
                  label={t("financial.analysis.totalMemberUsers")}
                  value={formatInteger(user.totalMemberUserNum)}
                />
                <StatItem
                  label={t("financial.analysis.totalUserSpending")}
                  value={formatAmount(user.totalRechargeAmount)}
                />
                <StatItem
                  label={t("financial.analysis.totalUserChats")}
                  value={formatInteger(user.totalChatNum)}
                />
              </div>
              <div className="border-border/40 border-t pt-4">
                <p className="text-muted-foreground mb-3 text-[11px] font-medium tracking-wider uppercase">
                  {t("financial.analysis.points")}
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <StatItem
                    label={t("financial.analysis.totalIssuedPoints")}
                    value={formatInteger(pointsIssued)}
                  />
                  <StatItem
                    label={t("financial.analysis.consumedPoints")}
                    value={formatInteger(pointsConsumed)}
                  />
                  <StatItem
                    label={t("financial.analysis.remainingPoints")}
                    value={formatInteger(pointsRemaining)}
                  />
                </div>
              </div>
            </div>
          </Block>
        </div>
      </div>
    </PageContainer>
  );
};

export default FinancialAnalysisIndexPage;
