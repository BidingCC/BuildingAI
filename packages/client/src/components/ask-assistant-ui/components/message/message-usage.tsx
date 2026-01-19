import { Button } from "@buildingai/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import { BarChart3Icon } from "lucide-react";
import { memo, useRef, useState } from "react";

interface Usage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  inputTokenDetails?: {
    noCacheTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
  outputTokenDetails?: {
    textTokens?: number;
    reasoningTokens?: number;
  };
  reasoningTokens?: number;
  cachedInputTokens?: number;
}

export interface MessageUsageProps {
  usage?: Usage;
  userConsumedPower?: number | null;
}

type ViewMode = "token" | "power";

export const MessageUsage = memo(function MessageUsage({
  usage,
  userConsumedPower,
}: MessageUsageProps) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("token");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;
  const totalTokens = usage?.totalTokens ?? 0;
  const inputDetails = usage?.inputTokenDetails;
  const outputDetails = usage?.outputTokenDetails;
  const reasoningTokens = usage?.reasoningTokens ?? outputDetails?.reasoningTokens ?? 0;
  const cachedInputTokens = usage?.cachedInputTokens ?? inputDetails?.cacheReadTokens ?? 0;
  const consumedPower = userConsumedPower ?? 0;

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex size-8 items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          title="查看消耗量"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <BarChart3Icon className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        ref={popoverRef}
        className="w-62"
        align="center"
        side="top"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">
              {viewMode === "token" ? "Token用量" : "积分消耗"}
            </div>
            <div className="flex gap-1 rounded-md border p-0.5">
              <Button
                variant={viewMode === "token" ? "default" : "ghost"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode("token");
                }}
                onMouseEnter={handleMouseEnter}
              >
                Token
              </Button>
              <Button
                variant={viewMode === "power" ? "default" : "ghost"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode("power");
                }}
                onMouseEnter={handleMouseEnter}
              >
                积分
              </Button>
            </div>
          </div>
          {viewMode === "token" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs">输入</div>
                  <div className="text-lg font-semibold">{inputTokens.toLocaleString()}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs">输出</div>
                  <div className="text-lg font-semibold">{outputTokens.toLocaleString()}</div>
                </div>
              </div>
              <div className="border-t pt-3">
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs">总计</div>
                  <div className="text-xl font-bold">{totalTokens.toLocaleString()}</div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-muted-foreground">文本 Tokens</div>
                    <div className="text-right font-medium">
                      {(outputDetails?.textTokens ?? outputTokens).toLocaleString()}
                    </div>
                    <div className="text-muted-foreground">思考 Tokens</div>
                    <div className="text-right font-medium">{reasoningTokens.toLocaleString()}</div>
                  </div>
                  {inputDetails && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-muted-foreground">非缓存输入</div>
                      <div className="text-right font-medium">
                        {(inputDetails.noCacheTokens ?? inputTokens).toLocaleString()}
                      </div>
                      <div className="text-muted-foreground">缓存命中</div>
                      <div className="text-right font-medium">
                        {(inputDetails.cacheReadTokens ?? cachedInputTokens).toLocaleString()}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-muted-foreground">缓存输入 Tokens</div>
                    <div className="text-right font-medium">
                      {cachedInputTokens.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="text-muted-foreground text-xs">消耗积分</div>
                <div className="text-2xl font-bold">{consumedPower.toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});
