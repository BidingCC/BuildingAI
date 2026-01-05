import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { sendMessage } from "../../pages/chat-api";
import type { ChatStatus, Message } from "./types";

export interface UseChatOptions {
  currentThreadId?: string;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onThreadCreated?: () => void;
  skipNextLoad?: (threadId: string) => void;
}

export interface UseChatReturn {
  status: ChatStatus;
  streamingMessageId: string | null;
  send: (content: string) => void;
  stop: () => void;
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const { currentThreadId, messages, setMessages, onThreadCreated, skipNextLoad } = options;
  const navigate = useNavigate();

  const [status, setStatus] = useState<ChatStatus>("ready");
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    (content: string) => {
      if (!content.trim()) return;

      const userMessage: Message = {
        key: nanoid(),
        from: "user",
        content: content.trim(),
      };

      const assistantId = nanoid();
      const assistantMessage: Message = {
        key: assistantId,
        from: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setStatus("submitted");

      abortRef.current = sendMessage(
        {
          threadId: currentThreadId,
          messages: [{ role: "user", content: content.trim() }],
        },
        {
          onThreadCreated: (newId) => {
            skipNextLoad?.(newId);
            navigate(`/c/${newId}`);
            onThreadCreated?.();
          },
          onStart: () => {
            setStatus("streaming");
            setStreamingMessageId(assistantId);
          },
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.key === assistantId ? { ...m, content: (m.content || "") + token } : m,
              ),
            );
          },
          onComplete: () => {
            setStatus("ready");
            setStreamingMessageId(null);
            abortRef.current = null;
            onThreadCreated?.();
          },
          onError: () => {
            setStatus("error");
            setStreamingMessageId(null);
            abortRef.current = null;
          },
        },
      );
    },
    [currentThreadId, setMessages, navigate, onThreadCreated, skipNextLoad],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("ready");
    setStreamingMessageId(null);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { status, streamingMessageId, send, stop };
}
