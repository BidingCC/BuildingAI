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
import type { UIMessage } from "ai";
import { AlertCircleIcon } from "lucide-react";
import { memo } from "react";

import { useSmoothText } from "../../hooks/use-smooth-text";
import { convertUIMessageToMessage } from "../../libs/message-converter";
import { MessageActions } from "./message-actions";
import { MessageBranch } from "./message-branch";
import { MessageTools } from "./message-tools";
import { StreamingIndicator } from "./streaming-indicator";

export interface MessageProps {
  message: UIMessage;
  liked?: boolean;
  disliked?: boolean;
  isStreaming?: boolean;
  branchNumber?: number;
  branchCount?: number;
  branches?: string[];
  error?: string;
  onLikeChange?: (liked: boolean) => void;
  onDislikeChange?: (disliked: boolean) => void;
  onRetry?: () => void;
  onSwitchBranch?: (messageId: string) => void;
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
}

export const Message = memo(function Message({
  message,
  liked = false,
  disliked = false,
  isStreaming = false,
  branchNumber = 1,
  branchCount = 1,
  branches = [],
  error,
  onLikeChange,
  onDislikeChange,
  onRetry,
  onSwitchBranch,
  addToolApprovalResponse,
}: MessageProps) {
  const messageData = convertUIMessageToMessage(message);

  if (!messageData.versions?.length) return null;

  const activeIndex = messageData.activeVersionIndex ?? 0;
  const activeVersion = messageData.versions[activeIndex] || messageData.versions[0];
  const content = activeVersion?.content || "";
  const attachments = activeVersion?.attachments;

  const isAssistant = messageData.from === "assistant";
  const isRegenerating = messageData.versions.some((v) => v.id.startsWith("regenerating-"));
  const isEmpty = !content.trim();
  const showStreamingIndicator = isAssistant && (isStreaming || isRegenerating) && isEmpty;
  const isProcessing = isStreaming || isRegenerating;

  const { text: smoothContent } = useSmoothText(content, {
    smooth: isAssistant && isStreaming,
    id: message.id,
  });

  return (
    <AIMessage from={messageData.from}>
      {isAssistant && messageData.reasoning && (
        <Reasoning duration={messageData.reasoning.duration} isStreaming={isStreaming}>
          <ReasoningTrigger />
          <ReasoningContent>{messageData.reasoning.content}</ReasoningContent>
        </Reasoning>
      )}

      {isAssistant && messageData.sources && messageData.sources.length > 0 && (
        <Sources>
          <SourcesTrigger count={messageData.sources.length} />
          <SourcesContent>
            {messageData.sources.map((source) => (
              <Source href={source.href} key={source.href} title={source.title} />
            ))}
          </SourcesContent>
        </Sources>
      )}

      {isAssistant && message.parts && (
        <MessageTools parts={message.parts} addToolApprovalResponse={addToolApprovalResponse} />
      )}

      <div className="min-w-0">
        {error && (
          <Alert variant="destructive">
            <AlertCircleIcon className="size-4" />
            <AlertTitle>chat error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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

        <AIMessageContent>
          {showStreamingIndicator ? (
            <StreamingIndicator />
          ) : isAssistant ? (
            <AIMessageResponse>{smoothContent}</AIMessageResponse>
          ) : (
            content
          )}
        </AIMessageContent>

        {isAssistant && (
          <AIMessageToolbar className="mt-4 min-w-0">
            <MessageBranch
              branchNumber={branchNumber}
              branchCount={branchCount}
              branches={branches}
              onSwitchBranch={onSwitchBranch}
            />
            {!isProcessing && (
              <MessageActions
                liked={liked}
                disliked={disliked}
                content={content}
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
