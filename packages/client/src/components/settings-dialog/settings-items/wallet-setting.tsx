import { useAuthStore } from "@buildingai/stores";
import { Button } from "@buildingai/ui/components/ui/button";
import { ChevronRight, CircleDollarSign, Info } from "lucide-react";

const WalletSetting = () => {
  const { userInfo } = useAuthStore((state) => state.auth);

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
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, index) => {
            return (
              <div className="bg-card flex flex-col rounded-lg border p-4">
                <span>1082{index + 1}</span>
                <span className="text-muted-foreground text-sm">套餐{index + 1}这样那样的</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export { WalletSetting };
