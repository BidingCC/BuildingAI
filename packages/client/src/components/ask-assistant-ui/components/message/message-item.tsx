import { memo } from "react";

import type { DisplayMessage } from "../../types";
import { Message } from "./message";

export interface MessageItemProps {
  displayMessage: DisplayMessage;
  isStreaming: boolean;
  error?: string;
  liked?: boolean;
  disliked?: boolean;
  onLike: (id: string, value: boolean) => void;
  onDislike: (id: string, value: boolean) => void;
  onRegenerate: (id: string) => void;
  onSwitchBranch: (messageId: string) => void;
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
}

export const MessageItem = memo(
  function MessageItem({
    displayMessage,
    isStreaming,
    error,
    liked,
    disliked,
    onLike,
    onDislike,
    onRegenerate,
    onSwitchBranch,
    addToolApprovalResponse,
  }: MessageItemProps) {
    const { id, message, branchNumber, branchCount, branches } = displayMessage;

    return (
      <Message
        message={message}
        liked={liked}
        disliked={disliked}
        isStreaming={isStreaming}
        branchNumber={branchNumber}
        branchCount={branchCount}
        branches={branches}
        error={error}
        onLikeChange={(v) => onLike(id, v)}
        onDislikeChange={(v) => onDislike(id, v)}
        onRetry={() => onRegenerate(id)}
        onSwitchBranch={onSwitchBranch}
        addToolApprovalResponse={addToolApprovalResponse}
      />
    );
  },
  (prev, next) => {
    if (prev.displayMessage.id !== next.displayMessage.id) return false;

    const prevMsg = prev.displayMessage.message;
    const nextMsg = next.displayMessage.message;
    if (prevMsg.parts !== nextMsg.parts) {
      const getTextContent = (parts: typeof prevMsg.parts) =>
        parts
          ?.filter((p) => p.type === "text")
          .map((p) => (p as { text: string }).text)
          .join("") || "";
      if (getTextContent(prevMsg.parts) !== getTextContent(nextMsg.parts)) return false;
    }

    if (prev.displayMessage.branchNumber !== next.displayMessage.branchNumber) return false;
    if (prev.displayMessage.branchCount !== next.displayMessage.branchCount) return false;
    if (prev.isStreaming !== next.isStreaming) return false;
    if (prev.error !== next.error) return false;
    if (prev.liked !== next.liked) return false;
    if (prev.disliked !== next.disliked) return false;

    return true;
  },
);
