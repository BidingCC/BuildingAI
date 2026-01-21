import { type MessageRecord, useConversationMessagesQuery } from "@buildingai/services/console";
import { InfiniteScrollTop } from "@buildingai/ui/components/infinite-scroll-top";
import { cn } from "@buildingai/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MessageItem } from "@/components/ask-assistant-ui/components/message/message-item";
import { useMessageRepository } from "@/components/ask-assistant-ui/hooks/use-message-repository";
import type { RawMessageRecord } from "@/components/ask-assistant-ui/libs/message-repository";

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

const convertMessageRecordToRawRecord = (record: MessageRecord): RawMessageRecord => {
  return {
    id: record.id,
    parentId: record.parentId ?? null,
    sequence: record.sequence,
    message: convertMessageRecordToUIMessage(record),
    createdAt: record.createdAt,
  };
};

interface ConversationMessagesProps {
  conversationId: string;
}

export const ConversationMessages = memo(function ConversationMessages({
  conversationId,
}: ConversationMessagesProps) {
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
          const rawRecords = data.items.map(convertMessageRecordToRawRecord);
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
            const rawRecords = newItems.map(convertMessageRecordToRawRecord);
            importIncremental(rawRecords, true);
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
        {displayMessages.map((displayMsg) => (
          <MessageItem
            key={displayMsg.id}
            displayMessage={displayMsg}
            isStreaming={false}
            liked={false}
            disliked={false}
          />
        ))}
      </div>
    </InfiniteScrollTop>
  );
});
