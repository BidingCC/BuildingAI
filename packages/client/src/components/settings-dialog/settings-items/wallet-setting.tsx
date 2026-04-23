"use client";

import { useUserInfoQuery } from "@buildingai/services/shared";
import {
  type RechargeRuleItem,
  type TaskAwardItem,
  useRechargeCenterQuery,
  useTaskAwardCenterQuery,
  useTaskAwardSignMutation,
} from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { cn } from "@buildingai/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, CircleDollarSign, Coins, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PowerDetailDialog } from "./power-detail-dialog";
import { RechargeDetailDialog } from "./recharge-detail-dialog";

function formatPrice(amount: number) {
  return `¥${Number(amount).toFixed(2)}`;
}

const WalletSetting = () => {
  const queryClient = useQueryClient();
  const { userInfo } = useAuthStore((state) => state.auth);
  const { isLogin, setUserInfo } = useAuthStore((state) => state.authActions);
  const { data: center, isLoading } = useRechargeCenterQuery();
  const {
    data: taskAwards,
    isLoading: isTaskLoading,
    refetch: refetchTaskCenter,
  } = useTaskAwardCenterQuery({
    enabled: isLogin(),
  });
  const { refetch: refetchUserInfo } = useUserInfoQuery({ enabled: isLogin() });
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<RechargeRuleItem | null>(null);
  const [powerDetailOpen, setPowerDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"recharge" | "task">("recharge");

  const rechargeRule = center?.rechargeRule ?? [];
  const payWayList = center?.payWayList ?? [];
  const rechargeExplain = center?.rechargeExplain ?? "";
  const rechargeStatus = center?.rechargeStatus ?? false;
  const taskList = taskAwards ?? [];

  const signMutation = useTaskAwardSignMutation();

  const handleCardClick = (rule: RechargeRuleItem) => {
    if (!rechargeStatus) return;
    setSelectedRule(rule);
    setDetailOpen(true);
  };

  const handleSign = async () => {
    await signMutation.mutateAsync();
    await queryClient.invalidateQueries({ queryKey: ["user", "account-log"] });
    await refetchTaskCenter();
    const latestUserInfo = (await refetchUserInfo()).data;
    if (latestUserInfo) {
      setUserInfo(latestUserInfo);
    }
    toast.success("签到成功");
  };

  const getTaskTitle = (item: TaskAwardItem) => {
    if (item.type === "sign") return "每日签到";
    if (item.type === "login") return "每日登录";
    return item.name;
  };

  const getTaskDesc = (item: TaskAwardItem) => {
    return item.desc;
  };

  const renderTaskAction = (item: TaskAwardItem) => {
    if (item.type === "sign") {
      return (
        <Button
          size="sm"
          onClick={() => void handleSign()}
          loading={signMutation.isPending}
          disabled={item.isGet}
          className={cn(
            "h-7 rounded-full px-4 text-[11px] font-medium",
            item.isGet && "text-primary bg-[#E9E8FF] hover:bg-[#E9E8FF]",
          )}
        >
          {item.isGet ? "已完成" : "签到"}
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        variant="secondary"
        disabled
        className={cn(
          "h-7 rounded-full px-4 text-[11px] font-medium",
          item.isGet && "text-primary bg-[#E9E8FF] hover:bg-[#E9E8FF]",
          !item.isGet && "bg-muted text-muted-foreground hover:bg-muted",
        )}
      >
        {item.isGet ? "已完成" : "未完成"}
      </Button>
    );
  };

  return (
    <>
      <div className="bg-primary relative overflow-hidden rounded-xl p-6">
        <div className="flex flex-col gap-1">
          <span className="text-primary-foreground/70 text-sm">积分余额</span>
          <span className="text-primary-foreground flex items-end leading-none">
            <span className="text-3xl leading-none font-bold">{userInfo?.power}</span>
          </span>
        </div>
        <div className="mt-2 flex">
          <Button
            size="xs"
            variant="ghost"
            className="hover:bg-primary-foreground/15 text-primary-foreground hover:text-primary-foreground px-0 text-xs hover:px-1.5"
            onClick={() => setPowerDetailOpen(true)}
          >
            <Info />
            积分明细
            <ChevronRight />
          </Button>
        </div>
        <CircleDollarSign className="text-primary-foreground absolute right-4 bottom-0 size-30 translate-y-1/3 opacity-20" />
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-6">
          <button
            type="button"
            className={cn(
              "text-muted-foreground border-b-2 border-transparent pb-2 text-sm font-bold transition-colors",
              activeTab === "recharge" && "text-foreground border-primary",
            )}
            onClick={() => setActiveTab("recharge")}
          >
            积分购买
          </button>
          <button
            type="button"
            className={cn(
              "text-muted-foreground border-b-2 border-transparent pb-2 text-sm font-bold transition-colors",
              activeTab === "task" && "text-foreground border-primary",
            )}
            onClick={() => setActiveTab("task")}
          >
            积分任务
          </button>
        </div>

        {activeTab === "recharge" && (
          <>
            {isLoading && (
              <div className="text-muted-foreground py-6 text-center text-sm">加载中…</div>
            )}
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
                        className="absolute -top-px -right-px rounded-none rounded-tr-lg rounded-bl-lg border-0 px-2 py-0.5 text-[10px] font-medium shadow-none"
                        variant="default"
                      >
                        {rule.label}
                      </Badge>
                    )}
                    <span className="font-semibold tabular-nums">
                      {rule.power.toLocaleString()}
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
          </>
        )}

        {activeTab === "task" && (
          <div className="space-y-3">
            {isTaskLoading && (
              <div className="text-muted-foreground py-6 text-center text-sm">加载中…</div>
            )}
            {!isTaskLoading &&
              taskList.map((item) => (
                <div
                  key={item.type}
                  className="flex items-center justify-between rounded-2xl border border-[#ECECF3] bg-white px-4 py-4"
                >
                  <div className="min-w-0 pr-4">
                    <div className="text-[15px] font-semibold">
                      {getTaskTitle(item)}
                      <span className="text-primary ml-2 inline-flex items-center gap-1 text-xs font-semibold">
                        <Coins className="size-3 text-amber-500" />+{item.award}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-1 text-xs">{getTaskDesc(item)}</div>
                  </div>
                  <div className="shrink-0">{renderTaskAction(item)}</div>
                </div>
              ))}
            {!isTaskLoading && taskList.length === 0 && (
              <div className="text-muted-foreground py-6 text-center text-sm">暂无积分任务</div>
            )}
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

      <PowerDetailDialog open={powerDetailOpen} onOpenChange={setPowerDetailOpen} />
    </>
  );
};

export { WalletSetting };
