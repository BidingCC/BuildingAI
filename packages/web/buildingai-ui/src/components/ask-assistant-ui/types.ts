import type { ToolUIPart, UIMessage } from "ai";
import type { ReactNode, RefObject } from "react";

/**
 * 消息附件类型
 */
export interface MessageAttachment {
  type: "file";
  url: string;
  mediaType?: string;
  filename?: string;
}

/**
 * 消息版本类型（支持分支对话和多模态）
 */
export interface MessageVersion {
  id: string;
  content: string;
  attachments?: MessageAttachment[];
}

/**
 * 信息来源类型
 */
export interface MessageSource {
  href: string;
  title: string;
}

/**
 * AI推理过程类型
 */
export interface MessageReasoning {
  content: string;
  duration: number;
}

/**
 * 工具调用类型
 */
export interface MessageToolCall {
  name: string;
  description: string;
  status: ToolUIPart["state"];
  parameters: Record<string, unknown>;
  result: string | undefined;
  error: string | undefined;
}

/**
 * 消息类型
 */
export interface Message {
  key: string;
  from: "user" | "assistant";
  versions: MessageVersion[];
  activeVersionIndex?: number;
  sources?: MessageSource[];
  reasoning?: MessageReasoning;
  tools?: MessageToolCall[];
}

export interface Thread {
  id: string;
  title: string;
  updatedAt?: Date | string;
  createdAt?: Date | string;
}

export interface Model {
  id: string;
  name: string;
  chef: string;
  chefSlug: string;
  providers: string[];
}

export interface Suggestion {
  id: string;
  text: string;
}

export type ChatStatus = "ready" | "submitted" | "streaming" | "error";

/**
 * 展示用的消息，包含分支信息
 */
export interface DisplayMessage {
  stableKey: string;
  id: string;
  message: UIMessage;
  parentId: string | null;
  sequence: number;
  branchNumber: number;
  branchCount: number;
  branches: string[];
  isLast: boolean;
}

export interface AssistantContextValue {
  /** 当前活跃分支的消息列表 */
  messages: UIMessage[];
  /** 当前活跃分支的展示消息列表（包含分支信息） */
  displayMessages: DisplayMessage[];
  threads: Thread[];
  currentThreadId?: string;
  status: ChatStatus;
  streamingMessageId: string | null;
  isLoading: boolean;
  error: Error | null;

  models: Model[];
  selectedModelId: string;
  suggestions: Suggestion[];

  liked: Record<string, boolean>;
  disliked: Record<string, boolean>;

  textareaRef: RefObject<HTMLTextAreaElement | null>;

  onSend: (content: string) => void;
  onStop: () => void;
  onRegenerate: (messageKey: string) => void;
  onSwitchBranch: (messageId: string) => void;
  onSelectModel: (id: string) => void;
  onLike: (messageKey: string, liked: boolean) => void;
  onDislike: (messageKey: string, disliked: boolean) => void;
}

export interface AssistantProviderProps extends AssistantContextValue {
  children: ReactNode;
}
