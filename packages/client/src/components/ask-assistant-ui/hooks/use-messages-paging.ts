import { getConversationMessages, useConversationMessagesQuery } from "@buildingai/services/web";
import type { UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

export interface UseMessagesPagingReturn {
  isLoadingMessages: boolean;
  isLoadingMoreMessages: boolean;
  hasMoreMessages: boolean;
  loadMoreMessages: () => void;
  mergeAndSortMessages: (base: UIMessage[], incoming: UIMessage[]) => UIMessage[];
}

export interface UseMessagesPagingOptions {
  setMessages: (messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void;
  lastMessageDbIdRef: React.RefObject<string | null>;
}

export function useMessagesPaging({
  setMessages,
  lastMessageDbIdRef,
}: UseMessagesPagingOptions): UseMessagesPagingReturn {
  const { id: currentThreadId } = useParams<{ id: string }>();
  const pageSize = 20;

  const { data: messagesData, isLoading: isLoadingMessages } = useConversationMessagesQuery(
    { conversationId: currentThreadId || "", page: 1, pageSize },
    { enabled: !!currentThreadId, refetchOnWindowFocus: false },
  );

  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const nextPageRef = useRef(2);
  const loadMoreLockRef = useRef(false);

  const mergeAndSortMessages = useCallback((base: UIMessage[], incoming: UIMessage[]) => {
    const map = new Map<string, UIMessage>();
    for (const m of base) map.set(m.id, m);
    for (const m of incoming) {
      if (!map.has(m.id)) map.set(m.id, m);
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const sa = (a.metadata as { sequence?: number } | undefined)?.sequence;
      const sb = (b.metadata as { sequence?: number } | undefined)?.sequence;
      const na = typeof sa === "number" ? sa : Number.POSITIVE_INFINITY;
      const nb = typeof sb === "number" ? sb : Number.POSITIVE_INFINITY;
      return na - nb;
    });
    return arr;
  }, []);

  useEffect(() => {
    if (!currentThreadId) {
      setMessages([]);
      return;
    }

    if (messagesData?.items.length) {
      setHasMoreMessages(messagesData.page < messagesData.totalPages);
      nextPageRef.current = Math.max(2, messagesData.page + 1);

      const pageMessages = messagesData.items
        .sort((a, b) => a.sequence - b.sequence)
        .map((item) => ({
          ...item.message,
          id: item.id,
          metadata: {
            ...(item.message.metadata ?? {}),
            sequence: item.sequence,
            ...(item.parentId && { parentId: item.parentId }),
            ...(item.createdAt && { createdAt: item.createdAt }),
            ...(item.usage && {
              usage: item.usage,
            }),
          },
        })) as UIMessage[];

      setMessages((prev) => {
        const merged = mergeAndSortMessages(prev, pageMessages);
        if (merged.length > 0) {
          lastMessageDbIdRef.current = merged[merged.length - 1].id;
        }
        return merged;
      });
    }
  }, [currentThreadId, messagesData, mergeAndSortMessages, setMessages, lastMessageDbIdRef]);

  const loadMoreMessages = useCallback(() => {
    const conversationId = currentThreadId;
    if (!conversationId) return;
    if (!hasMoreMessages) return;
    if (isLoadingMoreMessages) return;
    if (loadMoreLockRef.current) return;

    loadMoreLockRef.current = true;
    setIsLoadingMoreMessages(true);

    const page = nextPageRef.current;
    void getConversationMessages({ conversationId, page, pageSize })
      .then((res) => {
        setHasMoreMessages(res.page < res.totalPages);
        nextPageRef.current = res.page + 1;

        const incoming = res.items
          .sort((a, b) => a.sequence - b.sequence)
          .map((item) => ({
            ...item.message,
            id: item.id,
            metadata: {
              ...(item.message.metadata ?? {}),
              sequence: item.sequence,
              ...(item.parentId && { parentId: item.parentId }),
              ...(item.createdAt && { createdAt: item.createdAt }),
              ...(item.usage && {
                usage: item.usage,
              }),
            },
          })) as UIMessage[];

        setMessages((prev) => mergeAndSortMessages(prev, incoming));
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingMoreMessages(false);
        loadMoreLockRef.current = false;
      });
  }, [
    currentThreadId,
    hasMoreMessages,
    isLoadingMoreMessages,
    mergeAndSortMessages,
    pageSize,
    setMessages,
  ]);

  return {
    isLoadingMessages,
    isLoadingMoreMessages,
    hasMoreMessages,
    loadMoreMessages,
    mergeAndSortMessages,
  };
}
