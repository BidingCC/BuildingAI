import type { ComponentProps } from "react";
import { memo } from "react";

import { useAssistantContext } from "./context";
import { ThreadListSidebar } from "./threadlist-sidebar";

export interface ThreadListProps extends ComponentProps<"div"> {
  sidebarWidth?: string;
}

export const ThreadList = memo(function ThreadList({
  sidebarWidth = "256px",
  className,
  ...props
}: ThreadListProps) {
  const { sidebarOpen, threads, currentThreadId, onSelectThread, onNewChat, onDeleteThread } =
    useAssistantContext();

  if (!sidebarOpen) {
    return null;
  }

  return (
    <div
      className={`h-full overflow-hidden transition-all ${className || ""}`}
      style={{ width: sidebarWidth }}
      {...props}
    >
      <ThreadListSidebar
        threads={threads}
        selectedThreadId={currentThreadId}
        onThreadSelect={onSelectThread}
        onCreateNewThread={onNewChat}
        onDeleteThread={onDeleteThread}
      />
    </div>
  );
});
