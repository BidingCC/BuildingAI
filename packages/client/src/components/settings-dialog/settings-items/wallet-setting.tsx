"use client";

import { type RechargeRuleItem, useRechargeCenterQuery } from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { ChevronRight, CircleDollarSign, Info } from "lucide-react";
import { useState } from "react";

import { RechargeDetailDialog } from "./recharge-detail-dialog";

function formatPrice(amount: number) {
  return `¥${Number(amount).toFixed(2)}`;
}

const WalletSetting = () => {
  const { userInfo } = useAuthStore((state) => state.auth);
  const { data: center, isLoading } = useRechargeCenterQuery();
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<RechargeRuleItem | null>(null);

  const rechargeRule = center?.rechargeRule ?? [];
  const payWayList = center?.payWayList ?? [];
  const rechargeExplain = center?.rechargeExplain ?? "";
  const rechargeStatus = center?.rechargeStatus ?? false;

  const handleCardClick = (rule: RechargeRuleItem) => {
    if (!rechargeStatus) return;
    setSelectedRule(rule);
    setDetailOpen(true);
  };

  return (
    <div>
      <div className="bg-primary relative overflow-hidden rounded-xl p-6">
        <div className="flex flex-col gap-1">
          <span className="text-primary-foreground/70 text-sm">钱包余额</span>
          <span className="text-primary-foreground flex items-end leading-none">
            <span className="text-3xl leading-none font-bold">{userInfo?.power}</span>
          </span>
        </div>
        <div className="mt-2 flex">
          <Button
            size="xs"
            variant="ghost"
            className="hover:bg-primary-foreground/15 text-primary-foreground hover:text-primary-foreground px-0 text-xs hover:px-1.5"
          >
            <Info />
            积分明细
            <ChevronRight />
          </Button>
        </div>
        <CircleDollarSign className="text-primary-foreground absolute right-4 bottom-0 size-30 translate-y-1/3 opacity-20" />
      </div>

      <div className="mt-4 space-y-4">
        <h1 className="text-sm font-bold">积分购买</h1>
        {isLoading && <div className="text-muted-foreground py-6 text-center text-sm">加载中…</div>}
        {!rechargeStatus && !isLoading && (
          <div className="text-muted-foreground py-6 text-center text-sm">积分充值暂未开放</div>
        )}
        {rechargeStatus && !isLoading && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {rechargeRule.map((rule) => (
              <button
                key={rule.id}
                type="button"
                className="bg-card hover:border-primary hover:bg-primary/10 relative flex flex-col overflow-visible rounded-lg border p-4 text-left transition-colors"
                onClick={() => handleCardClick(rule)}
              >
                {rule.label && (
                  <Badge
                    className="absolute -top-px -right-px rounded-none rounded-tr-lg rounded-bl-lg border-0 px-2 py-0.5 text-[10px] font-medium shadow-lg shadow-none"
                    variant="default"
                  >
                    {rule.label}
                  </Badge>
                )}
                <span className="font-semibold tabular-nums">
                  {rule.power.toLocaleString()}

                  {rule.givePower > 0 && (
                    <span className="text-primary text-xs">
                      <span className="text-muted-foreground text-xs font-normal">+</span>
                      {rule.givePower.toLocaleString()}
                    </span>
                  )}
                </span>
                {rule.givePower > 0 ? (
                  <span className="text-muted-foreground text-xs">
                    赠送 <span className="text-primary">{rule.givePower}</span> 积分
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">无赠送积分</span>
                )}
                <span className="mt-2 text-right font-bold">{formatPrice(rule.sellPrice)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <RechargeDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        rule={selectedRule}
        payWayList={payWayList}
        rechargeExplain={rechargeExplain}
      />
    </div>
  );
};

export { WalletSetting };
