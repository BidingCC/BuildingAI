// Types
export type {
  AssistantContextValue,
  ChatStatus,
  DisplayMessage,
  Message,
  MessageAttachment,
  MessageReasoning,
  MessageSource,
  MessageToolCall,
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
export { useChatStream } from "./use-chat";

// Utils
export type { RawMessageRecord } from "./utils/message-repository";
export { MessageRepository } from "./utils/message-repository";
export type { UseMessageRepositoryReturn } from "./utils/use-message-repository";
export { useMessageRepository } from "./utils/use-message-repository";

// Main components
export type { ThreadProps } from "./thread";
export { Thread } from "./thread";

// Sub components
export type { MessageProps } from "./components/message";
export { Message as MessageComponent } from "./components/message";
export type { ModelData, ModelSelectorProps } from "./components/model-selector";
export { ModelSelector } from "./components/model-selector";
export type { PromptInputProps } from "./components/prompt-input";
export { PromptInput } from "./components/prompt-input";
export type { SuggestionData, SuggestionsProps } from "./components/suggestions";
export { Suggestions } from "./components/suggestions";
