import type { ToolUIPart, UIMessage } from "ai";
import type { ReactNode, RefObject } from "react";

/**
 * Message attachment type
 */
export interface MessageAttachment {
  type: "file";
  url: string;
  mediaType?: string;
  filename?: string;
}

/**
 * Message version type (supports branch conversations and multimodal)
 */
export interface MessageVersion {
  id: string;
  content: string;
  attachments?: MessageAttachment[];
}

/**
 * Message source type
 */
export interface MessageSource {
  href: string;
  title: string;
}

/**
 * AI reasoning process type
 */
export interface MessageReasoning {
  content: string;
  duration: number;
}

/**
 * Tool call type
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
 * Message type
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

export interface Model {
  id: string;
  name: string;
  chef: string;
  chefSlug: string;
  providers: string[];
  features?: string[];
  billingRule?: {
    power: number;
    tokens: number;
  };
}

export interface Suggestion {
  id: string;
  text: string;
}

export type ChatStatus = "ready" | "submitted" | "streaming" | "error";

/**
 * Display message with branch information
 */
export interface DisplayMessage {
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
  /** Messages in the current active branch */
  messages: UIMessage[];
  /** Display messages in the current active branch (with branch info) */
  displayMessages: DisplayMessage[];
  currentThreadId?: string;
  status: ChatStatus;
  streamingMessageId: string | null;
  isLoading: boolean;
  /** Whether currently loading more historical messages */
  isLoadingMoreMessages: boolean;
  /** Whether there are more historical messages to load */
  hasMoreMessages: boolean;

  models: Model[];
  selectedModelId: string;
  suggestions: Suggestion[];

  liked: Record<string, boolean>;
  disliked: Record<string, boolean>;

  textareaRef: RefObject<HTMLTextAreaElement | null>;

  onSend: (content: string) => void;
  /** Load more historical messages */
  onLoadMoreMessages: () => void;
  onStop: () => void;
  onRegenerate: (messageKey: string) => void;
  onSwitchBranch: (messageId: string) => void;
  onSelectModel: (id: string) => void;
  onLike: (messageKey: string, liked: boolean) => void;
  onDislike: (messageKey: string, disliked: boolean) => void;
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
}

export interface AssistantProviderProps extends AssistantContextValue {
  children: ReactNode;
}
