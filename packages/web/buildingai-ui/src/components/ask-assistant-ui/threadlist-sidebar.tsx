import { Button } from "@buildingai/ui/components/ui/button";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { memo, useCallback } from "react";

export interface ThreadItem {
  id: string;
  title: string;
  updatedAt?: Date | string;
  createdAt?: Date | string;
}

export interface ThreadListSidebarProps {
  threads: ThreadItem[];
  selectedThreadId?: string;
  onThreadSelect?: (threadId: string) => void;
  onCreateNewThread?: () => void;
  onDeleteThread?: (threadId: string) => void;
}

export const ThreadListSidebar = memo(
  ({
    threads,
    selectedThreadId,
    onThreadSelect,
    onCreateNewThread,
    onDeleteThread,
  }: ThreadListSidebarProps) => {
    const handleCreateNewThread = useCallback(() => {
      onCreateNewThread?.();
    }, [onCreateNewThread]);

    const handleThreadSelect = useCallback(
      (threadId: string) => {
        onThreadSelect?.(threadId);
      },
      [onThreadSelect],
    );

    const handleDeleteThread = useCallback(
      (threadId: string) => {
        onDeleteThread?.(threadId);
      },
      [onDeleteThread],
    );

    return (
      <div className="bg-sidebar text-sidebar-foreground flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-base font-semibold">对话记录</h2>
          {onCreateNewThread && (
            <Button onClick={handleCreateNewThread} size="sm" variant="default">
              <PlusIcon className="size-4" />
              <span>新建</span>
            </Button>
          )}
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 py-8">
              <p className="text-muted-foreground text-center text-sm">暂无对话记录</p>
              {onCreateNewThread && (
                <Button
                  className="mt-4"
                  onClick={handleCreateNewThread}
                  size="sm"
                  variant="outline"
                >
                  <PlusIcon className="size-4" />
                  <span>创建新对话</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="p-2">
              {threads.map((thread) => {
                const isSelected = selectedThreadId === thread.id;
                return (
                  <div
                    key={thread.id}
                    className={`group relative mb-1 rounded-md transition-colors ${
                      isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                    }`}
                  >
                    <button
                      className="focus-visible:ring-ring flex w-full items-start gap-3 rounded-md p-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      onClick={() => handleThreadSelect(thread.id)}
                      type="button"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{thread.title}</div>
                        {thread.updatedAt && (
                          <div className="text-muted-foreground mt-1 text-xs">
                            {typeof thread.updatedAt === "string"
                              ? thread.updatedAt
                              : thread.updatedAt.toLocaleDateString("zh-CN", {
                                  month: "short",
                                  day: "numeric",
                                })}
                          </div>
                        )}
                      </div>
                    </button>
                    {onDeleteThread && (
                      <Button
                        className="absolute top-1.5 right-1 size-7 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteThread(thread.id);
                        }}
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2Icon className="size-3.5" />
                        <span className="sr-only">删除对话</span>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    if (
      prevProps.threads.length !== nextProps.threads.length ||
      prevProps.selectedThreadId !== nextProps.selectedThreadId
    ) {
      return false;
    }
    return prevProps.threads.every((thread, index) => thread.id === nextProps.threads[index]?.id);
  },
);
