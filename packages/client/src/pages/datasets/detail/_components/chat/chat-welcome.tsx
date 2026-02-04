import { IconBulb } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { memo } from "react";

import type { WelcomeConfig } from "./chat-container";

interface ChatWelcomeProps {
  config?: WelcomeConfig | null;
  fallback?: ReactNode | string;
}

export const ChatWelcome = memo(function ChatWelcome({ config, fallback }: ChatWelcomeProps) {
  const title = config?.title ?? "知识库";
  const creator = config?.creator;
  const instruction = config?.instruction ?? "你可以通过提问了解知识库中的相关内容";

  if (!config && fallback) {
    return (
      <div className="flex flex-1 items-center justify-center py-4">
        <div className="text-center">{fallback}</div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden py-12">
      <div className="pointer-events-none absolute inset-0" aria-hidden />
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
