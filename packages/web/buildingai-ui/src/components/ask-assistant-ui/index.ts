/**
 * Ask Assistant UI component exports
 */

// Provider
export type { AskAssistantContextValue, AskAssistantProviderProps } from "./provider";
export { AskAssistantProvider } from "./provider";

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
  MessageVersion,
} from "./components/message";
export { Message } from "./components/message";
export type { ModelData, ModelSelectorProps } from "./components/model-selector";
export { ModelSelector } from "./components/model-selector";
export type { PromptInputProps } from "./components/prompt-input";
export { PromptInput } from "./components/prompt-input";
export type { SuggestionData, SuggestionsProps } from "./components/suggestions";
export { Suggestions } from "./components/suggestions";
