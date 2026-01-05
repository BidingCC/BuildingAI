import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  deleteThread as apiDeleteThread,
  getMessageList,
  getThreadList,
} from "../../pages/chat-api";
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

export function useThreads(): UseThreadsReturn {
  const navigate = useNavigate();
  const { id: currentThreadId } = useParams<{ id: string }>();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const skipLoadRef = useRef<string | null>(null);

  const refreshThreads = useCallback(async () => {
    setIsLoadingThreads(true);
    try {
      const list = await getThreadList();
      setThreads(list);
    } finally {
      setIsLoadingThreads(false);
    }
  }, []);

  const loadMessages = useCallback(async (threadId: string) => {
    setIsLoadingMessages(true);
    try {
      const list = await getMessageList(threadId);
      setMessages(list);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const selectThread = useCallback((id: string) => navigate(`/c/${id}`), [navigate]);

  const deleteThread = useCallback(
    async (id: string) => {
      await apiDeleteThread(id);
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

  useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  useEffect(() => {
    if (currentThreadId) {
      if (skipLoadRef.current === currentThreadId) {
        skipLoadRef.current = null;
        return;
      }
      loadMessages(currentThreadId);
    } else {
      setMessages([]);
    }
  }, [currentThreadId, loadMessages]);

  return {
    threads,
    currentThreadId,
    messages,
    isLoadingThreads,
    isLoadingMessages,
    selectThread,
    deleteThread,
    newChat,
    refreshThreads,
    setMessages,
    skipNextLoad,
  };
}
