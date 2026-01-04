import type { ComponentProps } from "react";
import { useContext } from "react";

import { AskAssistantContext } from "./context";
import { ThreadListSidebar } from "./threadlist-sidebar";

export interface ThreadListProps extends ComponentProps<"div"> {
  sidebarWidth?: string;
}

export const ThreadList = ({ sidebarWidth = "256px", className, ...props }: ThreadListProps) => {
  const context = useContext(AskAssistantContext);

  if (!context) {
    throw new Error("ThreadList must be used within AskAssistantProvider");
  }

  const {
    sidebarOpen,
    threads,
    selectedThreadId,
    setSelectedThreadId,
    createThread,
    deleteThread,
  } = context;

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
        selectedThreadId={selectedThreadId}
        onThreadSelect={setSelectedThreadId}
        onCreateNewThread={createThread}
        onDeleteThread={deleteThread}
      />
    </div>
  );
};
