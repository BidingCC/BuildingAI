import { type MessageRecord, useConversationMessagesQuery } from "@buildingai/services/web";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import type { Message } from "./types";

export interface UseThreadsReturn {
  currentThreadId?: string;
  messages: Message[];
  isLoadingMessages: boolean;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  skipNextLoad: (threadId: string) => void;
}

function convertMessageRecordToMessage(record: MessageRecord): Message {
  const content = record.content;

  return {
    key: record.id,
    from: record.role === "user" ? "user" : "assistant",
    content: typeof content === "string" ? content : undefined,
  };
}

export function useThreads(): UseThreadsReturn {
  const { id: currentThreadId } = useParams<{ id: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const skipLoadRef = useRef<string | null>(null);

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

  const skipNextLoad = useCallback((threadId: string) => {
    skipLoadRef.current = threadId;
  }, []);

  return {
    currentThreadId,
    messages,
    isLoadingMessages,
    setMessages,
    skipNextLoad,
  };
}
