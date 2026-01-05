import type { ReactNode, RefObject } from "react";

export interface MessageVersion {
  id: string;
  content: string;
}

export interface MessageAttachment {
  type: "file";
  url: string;
  mediaType?: string;
  filename?: string;
}

export interface Message {
  key: string;
  from: "user" | "assistant";
  content?: string;
  versions?: MessageVersion[];
  attachments?: MessageAttachment[];
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

export interface AssistantContextValue {
  messages: Message[];
  threads: Thread[];
  currentThreadId?: string;
  status: ChatStatus;
  streamingMessageId: string | null;
  isLoading: boolean;

  models: Model[];
  selectedModelId: string;
  suggestions: Suggestion[];

  sidebarOpen: boolean;
  liked: Record<string, boolean>;
  disliked: Record<string, boolean>;

  textareaRef: RefObject<HTMLTextAreaElement | null>;

  onSend: (content: string) => void;
  onStop: () => void;
  onSelectThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
  onNewChat: () => void;
  onToggleSidebar: () => void;
  onSelectModel: (id: string) => void;
  onLike: (messageKey: string, liked: boolean) => void;
  onDislike: (messageKey: string, disliked: boolean) => void;
}

export interface AssistantProviderProps extends AssistantContextValue {
  children: ReactNode;
}
