import {
  type ConversationRecord,
  type MessageRecord,
  useConversationMessagesQuery,
  useConversationsQuery,
} from "@buildingai/services/web";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { Message, Thread } from "./types";

export interface UseThreadsReturn {
  threads: Thread[];
  currentThreadId?: string;
  messages: Message[];
  isLoadingThreads: boolean;
  isLoadingMessages: boolean;
  selectThread: (id: string) => void;
  deleteThread: (id: string) => Promise<void>;
  newChat: () => void;
  refreshThreads: () => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  skipNextLoad: (threadId: string) => void;
}

/**
 * 转换会话记录为 Thread 格式
 */
function convertConversationToThread(record: ConversationRecord): Thread {
  return {
    id: record.id,
    title: record.title || "新对话",
    updatedAt: record.updatedAt ? new Date(record.updatedAt) : undefined,
    createdAt: record.createdAt ? new Date(record.createdAt) : undefined,
  };
}

/**
 * 转换消息记录为 Message 格式
 */
function convertMessageRecordToMessage(record: MessageRecord): Message {
  return {
    key: record.id,
    from: record.role === "user" ? "user" : "assistant",
    content: record.content,
  };
}

export function useThreads(): UseThreadsReturn {
  const navigate = useNavigate();
  const { id: currentThreadId } = useParams<{ id: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const skipLoadRef = useRef<string | null>(null);

  const {
    data: conversationsData,
    isLoading: isLoadingThreads,
    refetch: refreshThreads,
  } = useConversationsQuery(
    {
      page: 1,
      pageSize: 100,
    },
    {
      refetchOnWindowFocus: false,
    },
  );

  const { data: messagesData, isLoading: isLoadingMessages } = useConversationMessagesQuery(
    {
      conversationId: currentThreadId || "",
      page: 1,
      pageSize: 100,
    },
    {
      enabled: !!currentThreadId && skipLoadRef.current !== currentThreadId,
      refetchOnWindowFocus: false,
    },
  );

  const threads = useMemo<Thread[]>(() => {
    if (!conversationsData?.items) return [];
    return conversationsData.items.map(convertConversationToThread);
  }, [conversationsData]);

  useEffect(() => {
    if (currentThreadId) {
      if (skipLoadRef.current === currentThreadId) {
        skipLoadRef.current = null;
        return;
      }

      if (messagesData?.items) {
        const sortedMessages = [...messagesData.items].sort((a, b) => a.sequence - b.sequence);
        const convertedMessages = sortedMessages.map(convertMessageRecordToMessage);
        setMessages(convertedMessages);
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [currentThreadId, messagesData]);

  const selectThread = useCallback((id: string) => navigate(`/c/${id}`), [navigate]);

  const deleteThread = useCallback(
    async (id: string) => {
      // TODO: 实现删除会话的 API 调用
      // await deleteConversation(id);
      await refreshThreads();
      if (currentThreadId === id) {
        navigate("/");
      }
    },
    [currentThreadId, navigate, refreshThreads],
  );

  const newChat = useCallback(() => {
    setMessages([]);
    navigate("/");
  }, [navigate]);

  const skipNextLoad = useCallback((threadId: string) => {
    skipLoadRef.current = threadId;
  }, []);

  return {
    threads,
    currentThreadId,
    messages,
    isLoadingThreads,
    isLoadingMessages,
    selectThread,
    deleteThread,
    newChat,
    refreshThreads: async () => {
      await refreshThreads();
    },
    setMessages,
    skipNextLoad,
  };
}
