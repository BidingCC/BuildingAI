import {
  MessageAttachment as AIMessageAttachment,
  MessageAttachments as AIMessageAttachments,
} from "@buildingai/ui/components/ai-elements/attachments";
import {
  Message as AIMessage,
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
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Button } from "@buildingai/ui/components/ui/button";
import type { ReasoningUIPart, UIMessage } from "ai";
import { AlertCircleIcon, Bot } from "lucide-react";
import { memo, type ReactNode, useEffect, useMemo, useState } from "react";

import { useOptionalAssistantContext } from "../../context";
import { useSmoothText } from "../../hooks/use-smooth-text";
import { convertUIMessageToMessage } from "../../libs/message-converter";
import { InlineCitation } from "../tools/inline-citation";
import type { KnowledgeReferenceItem } from "../tools/knowledge-references";
// import { FileParseQueue } from "./file-parse-queue";
import { MessageActions } from "./message-actions";
import { MessageBranch } from "./message-branch";
import { FeedbackCard, MessageFeedback } from "./message-feedback";
import { MessageTools } from "./message-tools";
import { StreamingIndicator } from "./streaming-indicator";
import { UserMessageActions } from "./user-message-actions";

type UsageData = Record<string, unknown> & {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  extraTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
  userConsumedPower?: number | null;
  inputTokenDetails?: {
    noCacheTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
  outputTokenDetails?: {
    textTokens?: number;
    reasoningTokens?: number;
  };
  raw?: Record<string, unknown>;
};

const sum = (a?: number | null, b?: number | null) => (a ?? 0) + (b ?? 0);

function mergeUsageData(previous: UsageData, current: UsageData): UsageData {
  return {
    ...previous,
    ...current,
    inputTokens: sum(previous.inputTokens, current.inputTokens),
    outputTokens: sum(previous.outputTokens, current.outputTokens),
    totalTokens: sum(previous.totalTokens, current.totalTokens),
    extraTokens: sum(previous.extraTokens, current.extraTokens),
    reasoningTokens: sum(previous.reasoningTokens, current.reasoningTokens),
    cachedInputTokens: sum(previous.cachedInputTokens, current.cachedInputTokens),
    userConsumedPower: sum(previous.userConsumedPower, current.userConsumedPower),
    inputTokenDetails: {
      noCacheTokens: sum(
        previous.inputTokenDetails?.noCacheTokens,
        current.inputTokenDetails?.noCacheTokens,
      ),
      cacheReadTokens: sum(
        previous.inputTokenDetails?.cacheReadTokens,
        current.inputTokenDetails?.cacheReadTokens,
      ),
      cacheWriteTokens: sum(
        previous.inputTokenDetails?.cacheWriteTokens,
        current.inputTokenDetails?.cacheWriteTokens,
      ),
    },
    outputTokenDetails: {
      textTokens: sum(
        previous.outputTokenDetails?.textTokens,
        current.outputTokenDetails?.textTokens,
      ),
      reasoningTokens: sum(
        previous.outputTokenDetails?.reasoningTokens,
        current.outputTokenDetails?.reasoningTokens,
      ),
    },
    raw: current.raw ?? previous.raw,
  };
}

function getUsageFromParts(parts: UIMessage["parts"]): UsageData | undefined {
  const usageParts = (parts ?? [])
    .filter((part) => part.type === "data-usage")
    .map((part) =>
      part && typeof part === "object" && "data" in part
        ? ((part as { data?: UsageData }).data ?? undefined)
        : undefined,
    )
    .filter((data): data is UsageData => Boolean(data));

  if (usageParts.length === 0) return undefined;
  return usageParts.reduce((acc, item) => mergeUsageData(acc, item));
}

export interface MessageProps {
  message: UIMessage;
  liked?: boolean;
  disliked?: boolean;
  isStreaming?: boolean;
  isLast?: boolean;
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
  onSpeak?: (
    text: string,
    options?: { onReady?: (stop: () => void) => void },
  ) => void | Promise<void>;
  showConversationContext?: boolean;
  assistantAvatar?: string;
  extraActions?: ReactNode;
}

export const Message = memo(function Message({
  message,
  liked = false,
  disliked = false,
  isStreaming = false,
  isLast = false,
  branchNumber = 1,
  branchCount = 1,
  branches = [],
  onLikeChange,
  onDislikeChange,
  onRetry,
  onSwitchBranch,
  addToolApprovalResponse,
  onEditMessage,
  onSpeak,
  showConversationContext = true,
  assistantAvatar,
  extraActions,
}: MessageProps) {
  const [showFeedbackCard, setShowFeedbackCard] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [hideFollowUpSuggestions, setHideFollowUpSuggestions] = useState(false);
  const messageData = convertUIMessageToMessage(message);
  const metadata = message.metadata && typeof message.metadata === "object" ? message.metadata : {};
  const usageFromParts = getUsageFromParts(message.parts);
  const conversationContextPart = message.parts?.find(
    (part) => part.type === "data-conversation-context",
  );
  const msgWithUsage = message as { usage?: Record<string, unknown>; userConsumedPower?: number };
  const usageData =
    usageFromParts ??
    (msgWithUsage.usage != null
      ? msgWithUsage.usage
      : "usage" in metadata
        ? (metadata.usage as Record<string, unknown>)
        : undefined);
  const usage = usageData;
  const conversationContext =
    conversationContextPart &&
    typeof conversationContextPart === "object" &&
    "data" in conversationContextPart &&
    Array.isArray((conversationContextPart as { data?: { messages?: unknown } }).data?.messages)
      ? (
          conversationContextPart as {
            data: { messages: Array<{ role: string; content: string }> };
          }
        ).data.messages
      : undefined;
  const userConsumedPower =
    msgWithUsage.userConsumedPower ??
    (usageData && "userConsumedPower" in usageData
      ? (usageData.userConsumedPower as number | null | undefined)
      : undefined) ??
    ("userConsumedPower" in metadata
      ? (metadata.userConsumedPower as number | null | undefined)
      : undefined);
  const provider = "provider" in metadata ? (metadata.provider as string | undefined) : undefined;
  const modelName =
    "modelName" in metadata ? (metadata.modelName as string | undefined) : undefined;
  const errorMessage = message.parts
    ?.filter((part) => part.type === "data-error")
    .map((part) => (part as { data?: string }).data || "Unknown error")
    .join("\n");
  const assistantMessageIdPart = message.parts?.find(
    (part) => part.type === "data-assistant-message-id",
  );
  const resolvedMessageId =
    assistantMessageIdPart && "data" in assistantMessageIdPart && assistantMessageIdPart.data
      ? (assistantMessageIdPart.data as string)
      : message.id;

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

  const followUpSuggestions = useMemo(() => {
    if (!message.parts) return [];
    const part = message.parts.find((p) => p.type === "data-follow-up-suggestions");
    if (!part || typeof part !== "object" || !("data" in part)) return [];
    const data = (part as { data?: unknown }).data;
    if (!Array.isArray(data)) return [];
    return data.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
  }, [message.parts]);

  const assistantContext = useOptionalAssistantContext();
  const contextOnSend = assistantContext?.onSend;
  const isCurrentTailMessage = assistantContext
    ? assistantContext.displayMessages[assistantContext.displayMessages.length - 1]?.id ===
      message.id
    : isLast;

  useEffect(() => {
    setHideFollowUpSuggestions(false);
  }, [message.id]);

  const knowledgeRefs = useMemo(() => {
    if (!message.parts) return [];
    const refs: KnowledgeReferenceItem[] = [];
    for (const p of message.parts) {
      if (p.type !== "tool-datasetsSearch") continue;
      const output = (p as { output?: { found?: boolean; results?: KnowledgeReferenceItem[] } })
        .output;
      if (output?.found && Array.isArray(output.results)) {
        for (const r of output.results) {
          if (r && (r.title || r.source)) refs.push(r);
        }
      }
    }
    return refs;
  }, [message.parts]);

  const { text: smoothContent } = useSmoothText(content, {
    smooth: isAssistant && isStreaming,
    id: message.id,
  });

  const hasCitationPattern = /\[\^\d+\]/.test(smoothContent);
  const citationContent = useMemo(() => {
    if (!hasCitationPattern) return smoothContent;
    return smoothContent.replace(/\[\^(\d+)\]/g, "<sup>$1</sup>");
  }, [smoothContent, hasCitationPattern]);

  const citationComponents = useMemo(() => {
    if (!hasCitationPattern) return undefined;
    return {
      sup: ({ children }: { children?: React.ReactNode }) => {
        const text = String(children ?? "");
        const num = Number.parseInt(text, 10);
        if (Number.isNaN(num)) return <sup>{children}</sup>;
        return <InlineCitation index={num} references={knowledgeRefs} />;
      },
    };
  }, [hasCitationPattern, knowledgeRefs]);

  const handleEditMessage = (newContent: string) => {
    const files = attachments?.map((att) => ({
      type: "file" as const,
      url: att.url,
      ...(att.mediaType && { mediaType: att.mediaType }),
      ...(att.filename && { filename: att.filename }),
    }));
    onEditMessage?.(message.id, newContent, files);
  };

  const shouldShowFollowUpSuggestions =
    isAssistant &&
    isCurrentTailMessage &&
    followUpSuggestions.length > 0 &&
    !hideFollowUpSuggestions;

  const messageNode = (
    <AIMessage
      from={messageData.from}
      className={isEditingMessage && !isAssistant ? "max-w-full" : undefined}
    >
      {/* {isAssistant && (
        <FileParseQueue messageId={message.id} parts={message.parts} isStreaming={isStreaming} />
      )} */}
      {isAssistant &&
        message.parts
          ?.filter((part): part is ReasoningUIPart => part.type === "reasoning")
          .filter((part) => part.text && part.text.trim().length > 0)
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
              <AIMessageResponse
                isAnimating={isStreaming && message.role === "assistant"}
                components={citationComponents}
              >
                {citationContent}
              </AIMessageResponse>
            )}
            {shouldShowFollowUpSuggestions && (
              <div className="mt-3 flex flex-wrap gap-2">
                {followUpSuggestions.map((s, index) => (
                  <Button
                    key={`${message.id}-followup-${index}`}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      setHideFollowUpSuggestions(true);
                      contextOnSend?.(s);
                    }}
                  >
                    {s}
                  </Button>
                ))}
              </div>
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
                messageId={resolvedMessageId}
                liked={liked}
                disliked={disliked}
                content={content}
                errorMessage={errorMessage}
                usage={usage}
                conversationContext={showConversationContext ? conversationContext : undefined}
                userConsumedPower={userConsumedPower}
                provider={provider}
                modelName={modelName}
                onLikeChange={onLikeChange}
                onDislikeChange={onDislikeChange}
                onRetry={onRetry}
                onShowFeedbackCard={setShowFeedbackCard}
                onSpeak={onSpeak}
                extraActions={extraActions}
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

  if (isAssistant && assistantAvatar) {
    return (
      <div className="flex w-full max-w-[95%] gap-2">
        <Avatar className="size-8 shrink-0 rounded-full">
          <AvatarImage src={assistantAvatar} alt="" />
          <AvatarFallback className="rounded-full">
            <Bot className="size-4" />
          </AvatarFallback>
        </Avatar>
        {messageNode}
      </div>
    );
  }
  return messageNode;
});
