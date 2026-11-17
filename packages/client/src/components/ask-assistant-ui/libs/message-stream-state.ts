import type { ChatStatus, UIMessage } from "ai";

export function getStreamingMessageId(
  messages: readonly Pick<UIMessage, "id" | "role">[],
  status: ChatStatus,
): string | null {
  if (status !== "submitted" && status !== "streaming") return null;
  const lastMessage = messages.at(-1);
  return lastMessage?.role === "assistant" ? lastMessage.id : null;
}
