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
import { FeedbackCard, MessageFeedback } from "./message-feedback";
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
  onLikeChange?: (liked: boolean) => void | Promise<void>;
  onDislikeChange?: (
    disliked: boolean,
    dislikeReason?: string,
    isUpdate?: boolean,
  ) => void | Promise<void>;
  onRetry?: () => void;
  onSwitchBranch?: (messageId: string) => void;
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
  onEditMessage?: (
    messageId: string,
    newContent: string,
    files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>,
  ) => void;
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
  const [showFeedbackCard, setShowFeedbackCard] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const messageData = convertUIMessageToMessage(message);
  const usagePart = message.parts?.find((part) => part.type === "data-usage");
  const metadata = message.metadata && typeof message.metadata === "object" ? message.metadata : {};
  const usage = (
    usagePart && typeof usagePart === "object" && "data" in usagePart
      ? usagePart.data
      : "usage" in metadata
        ? metadata.usage
        : undefined
  ) as Record<string, unknown> | undefined;
  const userConsumedPower =
    "userConsumedPower" in metadata
      ? (metadata.userConsumedPower as number | null | undefined)
      : undefined;
  const provider = "provider" in metadata ? (metadata.provider as string | undefined) : undefined;
  const modelName =
    "modelName" in metadata ? (metadata.modelName as string | undefined) : undefined;

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

  const handleEditMessage = (newContent: string) => {
    const files = attachments?.map((att) => ({
      type: "file" as const,
      url: att.url,
      ...(att.mediaType && { mediaType: att.mediaType }),
      ...(att.filename && { filename: att.filename }),
    }));
    onEditMessage?.(message.id, newContent, files);
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
            onSend={onEditMessage ? handleEditMessage : undefined}
            onEditingChange={onEditMessage ? setIsEditingMessage : undefined}
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
          <AIMessageToolbar className="mt-2 min-w-0">
            {onSwitchBranch && (
              <MessageBranch
                branchNumber={branchNumber}
                branchCount={branchCount}
                branches={branches}
                onSwitchBranch={onSwitchBranch}
                disabled={isProcessing}
              />
            )}
            {!isProcessing && (
              <MessageActions
                liked={liked}
                disliked={disliked}
                content={content}
                usage={usage}
                userConsumedPower={userConsumedPower}
                provider={provider}
                modelName={modelName}
                onLikeChange={onLikeChange}
                onDislikeChange={onDislikeChange}
                onRetry={onRetry}
                onShowFeedbackCard={setShowFeedbackCard}
              />
            )}
          </AIMessageToolbar>
        )}
        {isAssistant && showFeedbackCard && onDislikeChange && (
          <FeedbackCard
            onSelectReason={async (reason) => {
              await onDislikeChange(true, reason, true);
              setShowFeedbackCard(false);
            }}
            onMore={() => {
              setFeedbackDialogOpen(true);
            }}
            onClose={() => setShowFeedbackCard(false)}
          />
        )}
      </div>
      {isAssistant && (
        <MessageFeedback
          open={feedbackDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setFeedbackDialogOpen(false);
            }
          }}
          onSubmit={async (reason) => {
            if (onDislikeChange) {
              await onDislikeChange(true, reason, true);
            }
            setFeedbackDialogOpen(false);
            setShowFeedbackCard(false);
          }}
          onCancel={() => {
            setFeedbackDialogOpen(false);
          }}
        />
      )}
    </AIMessage>
  );
});
