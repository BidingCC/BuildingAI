import type { UIMessage } from "ai";
import { memo } from "react";

import type { DisplayMessage } from "../../types";
import { Message } from "./message";

export interface MessageItemProps {
  displayMessage: DisplayMessage;
  isStreaming: boolean;
  liked?: boolean;
  disliked?: boolean;
  onLike?: (id: string, value: boolean) => void;
  onDislike?: (id: string, value: boolean) => void;
  onRegenerate?: (id: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onSwitchBranch?: (messageId: string) => void;
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
}

export const MessageItem = memo(
  function MessageItem({
    displayMessage,
    isStreaming,
    liked,
    disliked,
    onLike,
    onDislike,
    onRegenerate,
    onEditMessage,
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
        onLikeChange={onLike ? (v) => onLike(id, v) : undefined}
        onDislikeChange={onDislike ? (v) => onDislike(id, v) : undefined}
        onRetry={onRegenerate ? () => onRegenerate(id) : undefined}
        onEditMessage={onEditMessage}
        onSwitchBranch={onSwitchBranch}
        addToolApprovalResponse={addToolApprovalResponse}
      />
    );
  },
  (prev, next) => {
    const {
      displayMessage: prevDm,
      isStreaming: prevStreaming,
      liked: prevLiked,
      disliked: prevDisliked,
    } = prev;
    const {
      displayMessage: nextDm,
      isStreaming: nextStreaming,
      liked: nextLiked,
      disliked: nextDisliked,
    } = next;

    if (
      prevDm.id !== nextDm.id ||
      prevDm.branchNumber !== nextDm.branchNumber ||
      prevDm.branchCount !== nextDm.branchCount ||
      prevStreaming !== nextStreaming ||
      prevLiked !== nextLiked ||
      prevDisliked !== nextDisliked
    )
      return false;

    const serializeParts = (parts: UIMessage["parts"]) =>
      parts
        ?.map((p) => {
          const type = p.type;
          if (type === "text" || type === "reasoning") {
            return `${type}:${(p as { text?: string }).text || ""}`;
          }
          if (type === "file") {
            const fp = p as { url?: string; filename?: string; mediaType?: string };
            return `file:${fp.url || ""}:${fp.filename || ""}:${fp.mediaType || ""}`;
          }
          if (type === "source-url") {
            const sp = p as { url?: string; title?: string };
            return `source-url:${sp.url || ""}:${sp.title || ""}`;
          }
          if (typeof type === "string" && type.startsWith("tool-")) {
            const tp = p as {
              toolCallId?: string;
              state?: string;
              input?: unknown;
              output?: unknown;
            };
            return `${type}:${tp.toolCallId || ""}:${tp.state || ""}:${JSON.stringify(tp.input || {})}:${JSON.stringify(tp.output || {})}`;
          }
          return `${type}:${JSON.stringify(p)}`;
        })
        .join("|") || "";

    return serializeParts(prevDm.message.parts) === serializeParts(nextDm.message.parts);
  },
);
