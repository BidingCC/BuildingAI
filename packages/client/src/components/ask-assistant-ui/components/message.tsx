import {
  Message as AIMessage,
  MessageAction as AIMessageAction,
  MessageActions as AIMessageActions,
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
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@buildingai/ui/components/ai-elements/tool";
import { Alert, AlertDescription, AlertTitle } from "@buildingai/ui/components/ui/alert";
import { Button } from "@buildingai/ui/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@buildingai/ui/components/ui/button-group";
import type { UIMessage } from "ai";
import { AlertCircleIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { CopyIcon, RefreshCcwIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { memo } from "react";

import { convertUIMessageToMessage } from "../message-converter";
import { StreamingIndicator } from "./streaming-indicator";
import { Weather } from "./weather";

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

interface ToolPartData {
  toolCallId: string;
  state: string;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
  approval?: { id?: string; approved?: boolean };
}

const BranchSelector = memo(function BranchSelector({
  branchNumber,
  branchCount,
  branches,
  onSwitchBranch,
}: {
  branchNumber: number;
  branchCount: number;
  branches: string[];
  onSwitchBranch?: (messageId: string) => void;
}) {
  if (branchCount <= 1) return null;

  const handlePrevious = () => {
    if (branchNumber > 1) {
      const prevId = branches[branchNumber - 2];
      if (prevId) onSwitchBranch?.(prevId);
    }
  };

  const handleNext = () => {
    if (branchNumber < branchCount) {
      const nextId = branches[branchNumber];
      if (nextId) onSwitchBranch?.(nextId);
    }
  };

  return (
    <ButtonGroup
      className="[&>*:not(:first-child)]:rounded-l-md [&>*:not(:last-child)]:rounded-r-md"
      orientation="horizontal"
    >
      <Button
        aria-label="Previous branch"
        disabled={branchNumber <= 1}
        onClick={handlePrevious}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <ChevronLeftIcon size={14} />
      </Button>
      <ButtonGroupText className="text-muted-foreground border-none bg-transparent shadow-none">
        {branchNumber}/{branchCount}
      </ButtonGroupText>
      <Button
        aria-label="Next branch"
        disabled={branchNumber >= branchCount}
        onClick={handleNext}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <ChevronRightIcon size={14} />
      </Button>
    </ButtonGroup>
  );
});

const MessageActionButtons = memo(function MessageActionButtons({
  liked,
  disliked,
  content,
  onLikeChange,
  onDislikeChange,
  onRetry,
}: {
  liked: boolean;
  disliked: boolean;
  content: string;
  onLikeChange?: (liked: boolean) => void;
  onDislikeChange?: (disliked: boolean) => void;
  onRetry?: () => void;
}) {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  return (
    <AIMessageActions>
      <AIMessageAction label="Retry" onClick={onRetry} tooltip="重新生成">
        <RefreshCcwIcon className="size-4" />
      </AIMessageAction>
      <AIMessageAction label="Like" onClick={() => onLikeChange?.(!liked)} tooltip="喜欢">
        <ThumbsUpIcon className="size-4" fill={liked ? "currentColor" : "none"} />
      </AIMessageAction>
      <AIMessageAction
        label="Dislike"
        onClick={() => onDislikeChange?.(!disliked)}
        tooltip="不喜欢"
      >
        <ThumbsDownIcon className="size-4" fill={disliked ? "currentColor" : "none"} />
      </AIMessageAction>
      <AIMessageAction label="Copy" onClick={handleCopy} tooltip="复制">
        <CopyIcon className="size-4" />
      </AIMessageAction>
    </AIMessageActions>
  );
});

const WeatherTool = memo(function WeatherTool({
  toolPart,
  addToolApprovalResponse,
}: {
  toolPart: ToolPartData;
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
}) {
  const { state, approval, input, output, errorText } = toolPart;
  const approvalId = approval?.id;
  const isDenied =
    state === "output-denied" || (state === "approval-responded" && approval?.approved === false);
  const widthClass = "w-[min(100%,450px)]";

  if (state === "output-available") {
    return (
      <div className={widthClass}>
        <Weather weatherAtLocation={output as Parameters<typeof Weather>[0]["weatherAtLocation"]} />
      </div>
    );
  }

  if (isDenied) {
    return (
      <div className={widthClass}>
        <Tool className="w-full" defaultOpen>
          <ToolHeader state="output-denied" type="tool-getWeather" />
          <ToolContent>
            <div className="text-muted-foreground px-4 py-3 text-sm">
              Weather lookup was denied.
            </div>
          </ToolContent>
        </Tool>
      </div>
    );
  }

  if (errorText || (output as { error?: string })?.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50">
        错误: {String(errorText || (output as { error?: string })?.error)}
      </div>
    );
  }

  return (
    <div className={widthClass}>
      <Tool className="w-full" defaultOpen>
        <ToolHeader state={state as "input-available"} type="tool-getWeather" />
        <ToolContent>
          {(state === "input-available" || state === "approval-requested") && (
            <ToolInput input={input} />
          )}
          {state === "approval-requested" && approvalId && addToolApprovalResponse && (
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-3 py-1.5 text-sm transition-colors"
                onClick={() =>
                  addToolApprovalResponse({
                    id: approvalId,
                    approved: false,
                    reason: "User denied weather lookup",
                  })
                }
                type="button"
              >
                Deny
              </button>
              <button
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm transition-colors"
                onClick={() => addToolApprovalResponse({ id: approvalId, approved: true })}
                type="button"
              >
                Allow
              </button>
            </div>
          )}
        </ToolContent>
      </Tool>
    </div>
  );
});

const GenericTool = memo(function GenericTool({
  toolName,
  toolPart,
}: {
  toolName: string;
  toolPart: ToolPartData;
}) {
  return (
    <Tool>
      <ToolHeader
        state={toolPart.state as "input-available"}
        title={toolName}
        type="tool-invocation"
      />
      <ToolContent>
        <ToolInput input={toolPart.input} />
        <ToolOutput errorText={toolPart.errorText} output={toolPart.output} />
      </ToolContent>
    </Tool>
  );
});

const ToolCalls = memo(function ToolCalls({
  parts,
  addToolApprovalResponse,
}: {
  parts: UIMessage["parts"];
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
}) {
  const toolParts = parts.filter(
    (part) => typeof part.type === "string" && part.type.startsWith("tool-"),
  );

  if (toolParts.length === 0) return null;

  return (
    <>
      {toolParts.map((part, index) => {
        const toolPart = part as unknown as ToolPartData;
        const key = toolPart.toolCallId || `tool-${index}`;

        if (part.type === "tool-getWeather") {
          return (
            <WeatherTool
              key={key}
              toolPart={toolPart}
              addToolApprovalResponse={addToolApprovalResponse}
            />
          );
        }

        const toolName = (part.type as string).replace("tool-", "");
        return <GenericTool key={key} toolName={toolName} toolPart={toolPart} />;
      })}
    </>
  );
});

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
        <ToolCalls parts={message.parts} addToolApprovalResponse={addToolApprovalResponse} />
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
            <AIMessageResponse>{content}</AIMessageResponse>
          ) : (
            content
          )}
        </AIMessageContent>

        {isAssistant && (
          <AIMessageToolbar className="mt-4 min-w-0">
            <BranchSelector
              branchNumber={branchNumber}
              branchCount={branchCount}
              branches={branches}
              onSwitchBranch={onSwitchBranch}
            />
            {!isProcessing && (
              <MessageActionButtons
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
