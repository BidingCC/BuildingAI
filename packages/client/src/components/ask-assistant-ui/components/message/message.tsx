import {
  Message as AIMessage,
  MessageAttachment as AIMessageAttachment,
  MessageAttachments as AIMessageAttachments,
  MessageContent as AIMessageContent,
  MessageResponse as AIMessageResponse,
  MessageToolbar as AIMessageToolbar,
} from "@buildingai/ui/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@buildingai/ui/components/ai-elements/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@buildingai/ui/components/ai-elements/sources";
import { Alert, AlertDescription, AlertTitle } from "@buildingai/ui/components/ui/alert";
import type { ReasoningUIPart, UIMessage } from "ai";
import { AlertCircleIcon } from "lucide-react";
import { memo, useState } from "react";

import { useSmoothText } from "../../hooks/use-smooth-text";
import { convertUIMessageToMessage } from "../../libs/message-converter";
import { MessageActions } from "./message-actions";
import { MessageBranch } from "./message-branch";
import { MessageTools } from "./message-tools";
import { StreamingIndicator } from "./streaming-indicator";
import { UserMessageActions } from "./user-message-actions";

export interface MessageProps {
  message: UIMessage;
  liked?: boolean;
  disliked?: boolean;
  isStreaming?: boolean;
  branchNumber?: number;
  branchCount?: number;
  branches?: string[];
  onLikeChange?: (liked: boolean) => void;
  onDislikeChange?: (disliked: boolean) => void;
  onRetry?: () => void;
  onSwitchBranch?: (messageId: string) => void;
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
}

export const Message = memo(function Message({
  message,
  liked = false,
  disliked = false,
  isStreaming = false,
  branchNumber = 1,
  branchCount = 1,
  branches = [],
  onLikeChange,
  onDislikeChange,
  onRetry,
  onSwitchBranch,
  addToolApprovalResponse,
  onEditMessage,
}: MessageProps) {
  const messageData = convertUIMessageToMessage(message);
  const usagePart = message.parts?.find((part) => part.type === "data-usage");
  const usage = (
    usagePart && typeof usagePart === "object" && "data" in usagePart
      ? usagePart.data
      : message.metadata && typeof message.metadata === "object" && "usage" in message.metadata
        ? message.metadata.usage
        : undefined
  ) as Record<string, unknown> | undefined;
  const userConsumedPower =
    message.metadata &&
    typeof message.metadata === "object" &&
    "userConsumedPower" in message.metadata
      ? (message.metadata.userConsumedPower as number | null | undefined)
      : undefined;

  if (!messageData.versions?.length) return null;

  const activeVersion =
    messageData.versions[messageData.activeVersionIndex ?? 0] || messageData.versions[0];
  const content = activeVersion?.content || "";
  const attachments = activeVersion?.attachments;
  const isAssistant = messageData.from === "assistant";
  const isProcessing =
    isStreaming || messageData.versions.some((v) => v.id.startsWith("regenerating-"));
  const isEmpty = !content.trim();
  const hasReasoning = message.parts?.some((part) => part.type === "reasoning") ?? false;
  const showStreamingIndicator = isAssistant && isProcessing && isEmpty && !hasReasoning;
  const sources = messageData.sources;

  const { text: smoothContent } = useSmoothText(content, {
    smooth: isAssistant && isStreaming,
    id: message.id,
  });

  const [isEditingMessage, setIsEditingMessage] = useState(false);

  const handleEditMessage = (newContent: string) => {
    onEditMessage?.(message.id, newContent);
  };

  return (
    <AIMessage
      from={messageData.from}
      className={isEditingMessage && !isAssistant ? "max-w-full" : undefined}
    >
      {isAssistant &&
        message.parts
          ?.filter((part): part is ReasoningUIPart => part.type === "reasoning")
          .map((part, index, arr) => (
            <Reasoning
              key={`${message.id}-reasoning-${index}`}
              defaultOpen={isStreaming}
              isStreaming={isStreaming && index === arr.length - 1}
            >
              <ReasoningTrigger />
              <ReasoningContent>{part.text || ""}</ReasoningContent>
            </Reasoning>
          ))}

      {isAssistant && sources && sources.length > 0 && (
        <Sources>
          <SourcesTrigger count={sources.length} />
          <SourcesContent>
            {sources.map((source) => (
              <Source href={source.href} key={source.href} title={source.title} />
            ))}
          </SourcesContent>
        </Sources>
      )}

      {isAssistant && message.parts && (
        <MessageTools parts={message.parts} addToolApprovalResponse={addToolApprovalResponse} />
      )}

      <div className="min-w-0">
        {message.parts
          ?.filter((part) => part.type === "data-error")
          .map((part, index) => {
            const errorPart = part as { data?: string };
            return (
              <Alert key={`error-${index}`} variant="destructive">
                <AlertCircleIcon className="size-4" />
                <AlertTitle>chat error</AlertTitle>
                <AlertDescription>{errorPart.data || "Unknown error"}</AlertDescription>
              </Alert>
            );
          })}

        {attachments && attachments.length > 0 && (
          <AIMessageAttachments className="mb-2">
            {attachments.map((attachment) => (
              <AIMessageAttachment
                key={attachment.url}
                data={{ ...attachment, mediaType: attachment.mediaType ?? "" }}
              />
            ))}
          </AIMessageAttachments>
        )}

        {!isAssistant ? (
          <UserMessageActions
            content={content}
            onSend={handleEditMessage}
            onEditingChange={setIsEditingMessage}
            branchNumber={branchNumber}
            branchCount={branchCount}
            branches={branches}
            onSwitchBranch={onSwitchBranch}
            disabled={isProcessing}
          />
        ) : (
          <AIMessageContent>
            {showStreamingIndicator ? (
              <StreamingIndicator />
            ) : (
              <AIMessageResponse isAnimating={isStreaming && message.role === "assistant"}>
                {smoothContent}
              </AIMessageResponse>
            )}
          </AIMessageContent>
        )}

        {isAssistant && (
          <AIMessageToolbar className="mt-4 min-w-0">
            <MessageBranch
              branchNumber={branchNumber}
              branchCount={branchCount}
              branches={branches}
              onSwitchBranch={onSwitchBranch}
              disabled={isProcessing}
            />
            {!isProcessing && (
              <MessageActions
                liked={liked}
                disliked={disliked}
                content={content}
                usage={usage}
                userConsumedPower={userConsumedPower}
                onLikeChange={onLikeChange}
                onDislikeChange={onDislikeChange}
                onRetry={onRetry}
              />
            )}
          </AIMessageToolbar>
        )}
      </div>
    </AIMessage>
  );
});
