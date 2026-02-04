import {
  type DatasetsMessageRecord,
  getDatasetsConversationMessages,
} from "@buildingai/services/web";
import type { UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

const PAGE_SIZE = 20;

function mapRecordToUIMessage(item: DatasetsMessageRecord): UIMessage {
  return {
    ...item.message,
    id: item.id,
    metadata: {
      ...(item.message.metadata ?? {}),
      sequence: item.sequence,
      ...(item.parentId != null && { parentId: item.parentId }),
      ...(item.createdAt && { createdAt: item.createdAt }),
      ...(item.usage && { usage: item.usage }),
    },
  } as UIMessage;
}

function mergeAndSort(base: UIMessage[], incoming: UIMessage[]): UIMessage[] {
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
}

export interface UseDatasetsMessagesPagingOptions {
  datasetId: string;
  conversationId: string | undefined;
  setMessages: (messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void;
  lastMessageDbIdRef: React.RefObject<string | null>;
  shouldLoadInitial: boolean;
}

export interface UseDatasetsMessagesPagingReturn {
  isLoadingMessages: boolean;
  isLoadingMoreMessages: boolean;
  hasMoreMessages: boolean;
  loadMoreMessages: () => void;
}

export function useDatasetsMessagesPaging(
  options: UseDatasetsMessagesPagingOptions,
): UseDatasetsMessagesPagingReturn {
  const { datasetId, conversationId, setMessages, lastMessageDbIdRef, shouldLoadInitial } = options;

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const nextPageRef = useRef(2);
  const loadMoreLockRef = useRef(false);

  useEffect(() => {
    if (!datasetId || !conversationId || !shouldLoadInitial) {
      if (!conversationId) setHasMoreMessages(false);
      return;
    }

    setIsLoadingMessages(true);
    getDatasetsConversationMessages(datasetId, conversationId, {
      page: 1,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setHasMoreMessages(res.page < res.totalPages);
        nextPageRef.current = Math.max(2, res.page + 1);

        const pageMessages = res.items
          .sort((a, b) => a.sequence - b.sequence)
          .map(mapRecordToUIMessage);

        setMessages(pageMessages);
        if (pageMessages.length > 0) {
          lastMessageDbIdRef.current = pageMessages[pageMessages.length - 1].id;
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingMessages(false);
      });
  }, [datasetId, conversationId, shouldLoadInitial, setMessages, lastMessageDbIdRef]);

  const loadMoreMessages = useCallback(() => {
    if (!datasetId || !conversationId) return;
    if (!hasMoreMessages) return;
    if (isLoadingMoreMessages) return;
    if (loadMoreLockRef.current) return;

    loadMoreLockRef.current = true;
    setIsLoadingMoreMessages(true);

    const page = nextPageRef.current;
    getDatasetsConversationMessages(datasetId, conversationId, {
      page,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setHasMoreMessages(res.page < res.totalPages);
        nextPageRef.current = res.page + 1;

        const incoming = res.items
          .sort((a, b) => a.sequence - b.sequence)
          .map(mapRecordToUIMessage);

        setMessages((prev) => mergeAndSort(prev, incoming));
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingMoreMessages(false);
        loadMoreLockRef.current = false;
      });
  }, [datasetId, conversationId, hasMoreMessages, isLoadingMoreMessages, setMessages]);

  return {
    isLoadingMessages,
    isLoadingMoreMessages,
    hasMoreMessages,
    loadMoreMessages,
  };
}
