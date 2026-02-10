import {
  type FeedbackStats,
  type MessageRecord,
  useConversationFeedbacksQuery,
  useConversationMessagesQuery,
} from "@buildingai/services/console";
import { InfiniteScrollTop } from "@buildingai/ui/components/infinite-scroll-top";
import { Badge } from "@buildingai/ui/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@buildingai/ui/components/ui/tooltip";
import { cn } from "@buildingai/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { AlertTriangle, ThumbsDown, ThumbsUp } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MessageItem } from "@/components/ask-assistant-ui/components/message/message-item";
import { useMessageRepository } from "@/components/ask-assistant-ui/hooks/use-message-repository";
import type { RawMessageRecord } from "@/components/ask-assistant-ui/libs/message-repository";

const MessageFeedbackBadge = memo(function MessageFeedbackBadge({
  type,
  dislikeReason,
  confidenceScore = 0.5,
}: {
  type?: "like" | "dislike";
  dislikeReason?: string | null;
  confidenceScore?: number;
}) {
  if (!type) return null;

  if (type === "like") {
    return (
      <Badge variant="default" className="gap-1">
        <ThumbsUp className="size-3" />
        <span>赞</span>
      </Badge>
    );
  }

  const opacity = Math.max(0.3, Math.min(1, confidenceScore));
  const intensity = confidenceScore > 0.7 ? "high" : confidenceScore > 0.4 ? "medium" : "low";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="destructive"
            className="gap-1"
            style={{
              opacity,
              backgroundColor: `rgba(239, 68, 68, ${opacity})`,
            }}
          >
            <ThumbsDown className="size-3" />
            <span>踩</span>
            {intensity === "high" && <AlertTriangle className="size-3" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            {dislikeReason && (
              <div>
                <div className="font-semibold">原因：</div>
                <div className="text-sm">{dislikeReason}</div>
              </div>
            )}
            <div className="text-muted-foreground text-xs">
              置信度: {(confidenceScore * 100).toFixed(0)}%
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

export const ConversationFeedbackStats = memo(function ConversationFeedbackStats({
  stats,
  compact = false,
}: {
  stats?: FeedbackStats;
  compact?: boolean;
}) {
  const feedbackLabel = useMemo(() => {
    if (!stats || stats.total === 0) {
      return "暂无踩赞分析";
    }

    const likeRate = stats.likeRate;
    const dislikeRate = stats.dislikeRate;

    if (likeRate >= 70) {
      return "高赞率";
    } else if (dislikeRate >= 50) {
      return "高踩率";
    } else if (likeRate > dislikeRate && likeRate >= 30) {
      return "赞率较高";
    } else if (dislikeRate > likeRate && dislikeRate >= 30) {
      return "踩率较高";
    } else if (stats.total > 0) {
      return "反馈均衡";
    }

    return "暂无踩赞分析";
  }, [stats]);

  const feedbackVariant = useMemo(() => {
    if (!stats || stats.total === 0) {
      return "outline" as const;
    }

    const likeRate = stats.likeRate;
    const dislikeRate = stats.dislikeRate;

    if (likeRate >= 70) {
      return "default" as const;
    } else if (dislikeRate >= 50) {
      return "destructive" as const;
    }

    return "secondary" as const;
  }, [stats]);

  if (compact) {
    return (
      <Badge variant={feedbackVariant} className="gap-1 text-xs">
        {stats && stats.total > 0 && (
          <>
            {stats.likeRate >= 70 && <ThumbsUp className="size-3" />}
            {stats.dislikeRate >= 50 && <ThumbsDown className="size-3" />}
          </>
        )}
        <span>{feedbackLabel}</span>
      </Badge>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="text-muted-foreground text-xs">
        <span>{feedbackLabel}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      {stats && stats.total > 0 && (
        <>
          {stats.likeCount > 0 && (
            <div className="flex items-center gap-1 text-green-600">
              <ThumbsUp className="size-3" />
              <span>{stats.likeCount}</span>
              <span className="text-muted-foreground">({stats.likeRate.toFixed(0)}%)</span>
            </div>
          )}
          {stats.dislikeCount > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <ThumbsDown className="size-3" />
              <span>{stats.dislikeCount}</span>
              <span className="text-muted-foreground">({stats.dislikeRate.toFixed(0)}%)</span>
            </div>
          )}
        </>
      )}
    </div>
  );
});

const convertMessageRecordToUIMessage = (record: MessageRecord): UIMessage => {
  const role = record.message.role === "tool" ? "assistant" : record.message.role;
  return {
    id: record.id,
    role: role as "user" | "assistant" | "system",
    parts: (record.message.parts || []) as UIMessage["parts"],
    metadata: {
      ...record.message.metadata,
      usage: record.usage,
      userConsumedPower: record.userConsumedPower,
      status: record.status,
      errorMessage: record.errorMessage,
      provider: record.model?.provider?.provider,
      modelName: record.model?.name,
    },
  };
};

function buildRawRecordsFromMessageRecords(items: MessageRecord[]): RawMessageRecord[] {
  const sorted = [...items].sort((a, b) => a.sequence - b.sequence);
  const records: RawMessageRecord[] = [];
  let lastAssistantId: string | null = null;
  let lastUserId: string | null = null;

  for (const record of sorted) {
    const role = record.message.role === "tool" ? "assistant" : record.message.role;
    let parentId: string | null = record.parentId ?? null;

    if (parentId == null) {
      if (role === "user") {
        parentId = lastAssistantId;
        lastUserId = record.id;
      } else if (role === "assistant") {
        parentId = lastUserId;
        lastAssistantId = record.id;
      }
    } else {
      if (role === "user") lastUserId = record.id;
      else if (role === "assistant") lastAssistantId = record.id;
    }

    records.push({
      id: record.id,
      parentId,
      sequence: record.sequence,
      message: convertMessageRecordToUIMessage(record),
      createdAt: record.createdAt,
    });
  }

  return records;
}

interface ConversationMessagesDrawerProps {
  conversationId: string;
}

export const ConversationMessagesDrawer = memo(function ConversationMessagesDrawer({
  conversationId,
}: ConversationMessagesDrawerProps) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [allMessages, setAllMessages] = useState<MessageRecord[]>([]);
  const queryClient = useQueryClient();
  const prevConversationIdRef = useRef<string | null>(null);

  const { data, isLoading, isFetching } = useConversationMessagesQuery(
    {
      conversationId,
      page,
      pageSize,
    },
    {
      enabled: !!conversationId,
    },
  );

  const { data: feedbacksData } = useConversationFeedbacksQuery(
    {
      conversationId,
      page: 1,
      pageSize: 1000,
    },
    {
      enabled: !!conversationId,
    },
  );

  const feedbacksMap = useMemo(() => {
    const map = new Map<
      string,
      { type: "like" | "dislike"; dislikeReason?: string | null; confidenceScore?: number }
    >();
    feedbacksData?.items.forEach((feedback) => {
      map.set(feedback.messageId, {
        type: feedback.type,
        dislikeReason: feedback.dislikeReason,
        confidenceScore: feedback.confidenceScore,
      });
    });
    return map;
  }, [feedbacksData]);

  const isLoadingMore = isFetching && page > 1;

  const hasMore = useMemo(() => {
    if (data === undefined) return true;
    if (!data?.total) return false;
    return allMessages.length < data.total;
  }, [data, allMessages.length]);

  const {
    displayMessages,
    importMessages,
    importIncremental,
    clear: clearRepository,
  } = useMessageRepository();

  useEffect(() => {
    if (!conversationId) {
      setAllMessages([]);
      clearRepository();
      return;
    }

    if (data?.items) {
      if (page === 1) {
        setAllMessages(data.items);
        if (data.items.length > 0) {
          const rawRecords = buildRawRecordsFromMessageRecords(data.items);
          importMessages(rawRecords, true);
        } else {
          clearRepository();
        }
      } else {
        setAllMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newItems = data.items.filter((item) => !existingIds.has(item.id));
          if (newItems.length > 0) {
            const updated = [...newItems, ...prev];
            const rawRecords = buildRawRecordsFromMessageRecords(newItems);
            importIncremental(rawRecords, false);
            return updated;
          }
          return prev;
        });
      }
    }
  }, [data, page, conversationId, importMessages, importIncremental, clearRepository]);

  useEffect(() => {
    if (conversationId && prevConversationIdRef.current !== conversationId) {
      prevConversationIdRef.current = conversationId;
      setPage(1);
      setAllMessages([]);
      clearRepository();
      setSmooth(false);
      queryClient.invalidateQueries({
        queryKey: ["console", "conversation-messages", conversationId],
      });
    }
  }, [conversationId, clearRepository, queryClient]);

  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) return;
    setPage((prev) => prev + 1);
  }, [hasMore, isLoading, isLoadingMore]);

  const [smooth, setSmooth] = useState(false);

  useEffect(() => {
    if (displayMessages.length > 0 && !isLoading) {
      const timer = setTimeout(() => setSmooth(true), 200);
      return () => clearTimeout(timer);
    }
  }, [isLoading, displayMessages.length]);

  if (!conversationId) {
    return null;
  }

  if (isLoading && page === 1 && displayMessages.length === 0 && allMessages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="text-muted-foreground">加载消息中...</div>
      </div>
    );
  }

  if (
    !isLoading &&
    !isFetching &&
    displayMessages.length === 0 &&
    allMessages.length === 0 &&
    data !== undefined &&
    Array.isArray(data.items) &&
    data.items.length === 0
  ) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="text-muted-foreground">暂无消息</div>
      </div>
    );
  }

  if (
    displayMessages.length === 0 &&
    allMessages.length === 0 &&
    data === undefined &&
    !isLoading
  ) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="text-muted-foreground">加载消息中...</div>
      </div>
    );
  }

  return (
    <InfiniteScrollTop
      className={cn("chat-scroll flex-1", "contain-[layout_style_paint]")}
      prependKey={displayMessages[0]?.id ?? null}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      onLoadMore={handleLoadMore}
      hideScrollToBottomButton
      initial="instant"
      resize="instant"
    >
      {/* <InfiniteScrollTopScrollButton className="-top-12 z-20" /> */}
      <div
        className={cn(
          "mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-2 pb-10",
          "transition-opacity duration-200 ease-out",
          smooth ? "opacity-100" : "opacity-0",
        )}
      >
        {displayMessages.map((displayMsg) => {
          const feedback = feedbacksMap.get(displayMsg.id);
          const isAssistant = displayMsg.message.role === "assistant";
          return (
            <MessageItem
              key={displayMsg.id}
              displayMessage={displayMsg}
              isStreaming={false}
              liked={feedback?.type === "like"}
              disliked={feedback?.type === "dislike"}
              extraActions={
                isAssistant && feedback ? (
                  <MessageFeedbackBadge
                    type={feedback.type}
                    dislikeReason={feedback.dislikeReason}
                    confidenceScore={feedback.confidenceScore}
                  />
                ) : undefined
              }
            />
          );
        })}
      </div>
    </InfiniteScrollTop>
  );
});
