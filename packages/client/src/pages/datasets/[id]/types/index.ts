import type { PromptInputMessage } from "@buildingai/ui/components/ai-elements/prompt-input";
import type { ReactNode } from "react";

import type { Model } from "@/components/ask-assistant-ui";

// ============================================================================
// Chat Types
// ============================================================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type ChatStatus = "ready" | "submitted" | "streaming" | "error";

export interface WelcomeConfig {
  title: string;
  creator?: string;
  instruction?: string;
}

export interface Suggestion {
  id: string;
  text: string;
}

export interface ChatContainerProps {
  welcomeConfig?: WelcomeConfig;
  welcomeMessage?: ReactNode | string;
  messages?: ChatMessage[];
  onSend?: (text: string, files?: PromptInputMessage["files"]) => void;
  status?: ChatStatus;
  models?: Model[];
  selectedModelId?: string;
  onSelectModel?: (modelId: string) => void;
  suggestions?: Suggestion[];
}

// ============================================================================
// Document Types
// ============================================================================

export type DocumentSortBy = "name" | "size" | "uploadTime";

export type DropPhase = "idle" | "over" | "left";

export interface DocumentSelectionState {
  selectedIds: string[];
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
}

// ============================================================================
// Dialog Types
// ============================================================================

export interface DatasetEditFormValues {
  name: string;
  coverUrl?: string;
  description: string;
}
