// Types
export type {
  AssistantContextValue,
  ChatStatus,
  Message,
  MessageAttachment,
  MessageVersion,
  Model,
  Suggestion,
  Thread as ThreadType,
} from "./types";

// Context & Provider
export { AssistantContext, AssistantProvider, useAssistantContext } from "./context";

// Hooks
export type { UseAssistantOptions } from "./use-assistant";
export { useAssistant } from "./use-assistant";
export type { UseChatOptions, UseChatReturn } from "./use-chat";
export { useChat } from "./use-chat";
export type { UseThreadsReturn } from "./use-threads";
export { useThreads } from "./use-threads";

// Main components
export type { ThreadProps } from "./thread";
export { Thread } from "./thread";
export type { ThreadListProps } from "./thread-list";
export { ThreadList } from "./thread-list";
export type { ThreadItem, ThreadListSidebarProps } from "./threadlist-sidebar";
export { ThreadListSidebar } from "./threadlist-sidebar";

// Sub components
export type {
  MessageAttachmentType,
  MessageData,
  MessageProps,
  MessageVersion as MessageVersionType,
} from "./components/message";
export { Message as MessageComponent } from "./components/message";
export type { ModelData, ModelSelectorProps } from "./components/model-selector";
export { ModelSelector } from "./components/model-selector";
export type { PromptInputProps } from "./components/prompt-input";
export { PromptInput } from "./components/prompt-input";
export type { SuggestionData, SuggestionsProps } from "./components/suggestions";
export { Suggestions } from "./components/suggestions";
