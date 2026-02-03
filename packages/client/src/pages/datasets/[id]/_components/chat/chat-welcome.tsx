import { IconBulb } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { memo } from "react";

import { DEFAULT_INSTRUCTION } from "../../constants";
import type { WelcomeConfig } from "../../types";

interface ChatWelcomeProps {
  config?: WelcomeConfig | null;
  fallback?: ReactNode | string;
}

export const ChatWelcome = memo(function ChatWelcome({ config, fallback }: ChatWelcomeProps) {
  const title = config?.title ?? "知识库";
  const creator = config?.creator;
  const instruction = config?.instruction ?? DEFAULT_INSTRUCTION;

  if (!config && fallback) {
    return (
      <div className="flex flex-1 items-center justify-center py-4">
        <div className="text-center">{fallback}</div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden py-12">
      {/* 背景网格 */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.06)_1px,transparent_1px)] mask-[radial-gradient(ellipse_80%_80%_at_50%_50%,black_0%,black_35%,transparent_70%)] bg-size-[20px_20px] [-webkit-mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black_0%,black_35%,transparent_70%)]"
        aria-hidden
      />

      {/* 内容 */}
      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        <div className="bg-foreground flex size-20 items-center justify-center rounded-full">
          <IconBulb className="text-background size-10" stroke={1.5} />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">{title}</h2>
          {creator && <p className="text-muted-foreground text-sm">创建人: {creator}</p>}
          <p className="text-muted-foreground mt-1 text-sm">{instruction}</p>
        </div>
      </div>
    </div>
  );
});
