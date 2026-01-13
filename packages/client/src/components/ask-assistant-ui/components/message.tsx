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
import { memo, useCallback, useMemo } from "react";

import { convertUIMessageToMessage } from "../message-converter";
import { StreamingIndicator } from "./streaming-indicator";
import { Weather } from "./weather";

export interface MessageProps {
  message: UIMessage;
  liked?: boolean;
  disliked?: boolean;
  onLikeChange?: (liked: boolean) => void;
  onDislikeChange?: (disliked: boolean) => void;
  onRetry?: () => void;
  onCopy?: (content: string) => void;
  isStreaming?: boolean;
  branchNumber?: number;
  branchCount?: number;
  branches?: string[];
  onSwitchBranch?: (messageId: string) => void;
  error?: string;
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
}

export const Message = memo(
  ({
    message,
    liked = false,
    disliked = false,
    onLikeChange,
    onDislikeChange,
    onRetry,
    onCopy,
    isStreaming = false,
    branchNumber = 1,
    branchCount = 1,
    branches = [],
    onSwitchBranch,
    error,
    addToolApprovalResponse,
  }: MessageProps) => {
    const messageData = useMemo(() => convertUIMessageToMessage(message), [message]);

    const handleCopy = useCallback(
      (content: string) => {
        navigator.clipboard.writeText(content);
        onCopy?.(content);
      },
      [onCopy],
    );

    const handleRetry = useCallback(() => {
      onRetry?.();
    }, [onRetry]);

    const handleLike = useCallback(() => {
      onLikeChange?.(!liked);
    }, [onLikeChange, liked]);

    const handleDislike = useCallback(() => {
      onDislikeChange?.(!disliked);
    }, [onDislikeChange, disliked]);

    const handleBranchPrevious = useCallback(() => {
      if (branchNumber > 1 && branches.length > 0) {
        const prevBranchId = branches[branchNumber - 2];
        if (prevBranchId && onSwitchBranch) {
          onSwitchBranch(prevBranchId);
        }
      }
    }, [branchNumber, branches, onSwitchBranch]);

    const handleBranchNext = useCallback(() => {
      if (branchNumber < branchCount && branches.length > 0) {
        const nextBranchId = branches[branchNumber];
        if (nextBranchId && onSwitchBranch) {
          onSwitchBranch(nextBranchId);
        }
      }
    }, [branchNumber, branchCount, branches, onSwitchBranch]);

    const activeIndex = messageData.activeVersionIndex ?? 0;
    // 确保 versions 数组存在且不为空
    if (!messageData.versions || messageData.versions.length === 0) {
      return null;
    }
    const activeVersion = messageData.versions[activeIndex] || messageData.versions[0];
    const messageContent = activeVersion?.content || "";
    const attachments = activeVersion?.attachments;

    // 检查是否有正在重写的版本（id 以 regenerating- 开头）
    const isRegenerating = messageData.versions.some((v) => v.id.startsWith("regenerating-"));
    const isEmpty = !messageContent || messageContent.trim() === "";
    const showStreamingIndicator =
      messageData.from === "assistant" && (isStreaming || isRegenerating) && isEmpty;
    const isStreamingOrRegenerating = isStreaming || isRegenerating;

    // 检查是否有多个分支（基于传入的分支信息）
    const hasMultipleBranches = branchCount > 1;

    // 渲染消息内容
    const renderMessageContent = (content: string, versionAttachments?: typeof attachments) => (
      <>
        {versionAttachments && versionAttachments.length > 0 && (
          <AIMessageAttachments className="mb-2">
            {versionAttachments.map((attachment) => (
              <AIMessageAttachment
                data={{
                  ...attachment,
                  mediaType: attachment.mediaType ?? "",
                }}
                key={attachment.url}
              />
            ))}
          </AIMessageAttachments>
        )}
        <AIMessageContent>
          {showStreamingIndicator ? (
            <StreamingIndicator />
          ) : messageData.from === "assistant" ? (
            <AIMessageResponse>{content}</AIMessageResponse>
          ) : (
            content
          )}
        </AIMessageContent>
      </>
    );

    // 渲染消息操作按钮
    const renderActions = () => (
      <AIMessageActions>
        <AIMessageAction label="Retry" onClick={handleRetry} tooltip="重新生成">
          <RefreshCcwIcon className="size-4" />
        </AIMessageAction>
        <AIMessageAction label="Like" onClick={handleLike} tooltip="喜欢">
          <ThumbsUpIcon className="size-4" fill={liked ? "currentColor" : "none"} />
        </AIMessageAction>
        <AIMessageAction label="Dislike" onClick={handleDislike} tooltip="不喜欢">
          <ThumbsDownIcon className="size-4" fill={disliked ? "currentColor" : "none"} />
        </AIMessageAction>
        <AIMessageAction label="Copy" onClick={() => handleCopy(messageContent)} tooltip="复制">
          <CopyIcon className="size-4" />
        </AIMessageAction>
      </AIMessageActions>
    );

    // 渲染分支选择器
    const renderBranchSelector = () => {
      if (!hasMultipleBranches) return null;

      return (
        <ButtonGroup
          className="[&>*:not(:first-child)]:rounded-l-md [&>*:not(:last-child)]:rounded-r-md"
          orientation="horizontal"
        >
          <Button
            aria-label="Previous branch"
            disabled={branchNumber <= 1}
            onClick={handleBranchPrevious}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ChevronLeftIcon size={14} />
          </Button>
          <ButtonGroupText className="text-muted-foreground border-none bg-transparent shadow-none">
            {`${branchNumber}/${branchCount}`}
          </ButtonGroupText>
          <Button
            aria-label="Next branch"
            disabled={branchNumber >= branchCount}
            onClick={handleBranchNext}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ChevronRightIcon size={14} />
          </Button>
        </ButtonGroup>
      );
    };

    return (
      <AIMessage from={messageData.from} key={messageData.key}>
        {/* AI 推理过程 */}
        {messageData.from === "assistant" && messageData.reasoning && (
          <Reasoning duration={messageData.reasoning.duration} isStreaming={isStreaming}>
            <ReasoningTrigger />
            <ReasoningContent>{messageData.reasoning.content}</ReasoningContent>
          </Reasoning>
        )}

        {/* 信息来源 */}
        {messageData.from === "assistant" &&
          messageData.sources &&
          messageData.sources.length > 0 && (
            <Sources>
              <SourcesTrigger count={messageData.sources.length} />
              <SourcesContent>
                {messageData.sources.map((source) => (
                  <Source href={source.href} key={source.href} title={source.title} />
                ))}
              </SourcesContent>
            </Sources>
          )}

        {/* 工具调用 */}
        {messageData.from === "assistant" &&
          message.parts &&
          message.parts
            .filter((part) => typeof part.type === "string" && part.type.startsWith("tool-"))
            .map((part, index) => {
              // 特殊处理 getWeather 工具
              if (part.type === "tool-getWeather") {
                const toolPart = part as {
                  toolCallId: string;
                  state: string;
                  input?: Record<string, unknown>;
                  output?: any;
                  errorText?: string;
                  approval?: { id?: string; approved?: boolean };
                };

                const state = toolPart.state;
                const approvalId = (toolPart as any).approval?.id;
                const isDenied =
                  state === "output-denied" ||
                  (state === "approval-responded" && toolPart.approval?.approved === false);
                const widthClass = "w-[min(100%,450px)]";

                // 输出可用 - 显示天气组件
                if (state === "output-available") {
                  return (
                    <div
                      className={widthClass}
                      key={toolPart.toolCallId || `tool-weather-${index}`}
                    >
                      <Weather weatherAtLocation={toolPart.output} />
                    </div>
                  );
                }

                // 被拒绝
                if (isDenied) {
                  return (
                    <div className={widthClass} key={toolPart.toolCallId || `tool-${index}`}>
                      <Tool className="w-full" defaultOpen={true}>
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

                // 错误处理
                if (toolPart.errorText || toolPart.output?.error) {
                  return (
                    <div
                      className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                      key={toolPart.toolCallId || `tool-error-${index}`}
                    >
                      错误: {String(toolPart.errorText || toolPart.output?.error)}
                    </div>
                  );
                }

                // 其他状态（input-available, approval-requested, approval-responded）
                return (
                  <div className={widthClass} key={toolPart.toolCallId || `tool-${index}`}>
                    <Tool className="w-full" defaultOpen={true}>
                      <ToolHeader state={state as any} type="tool-getWeather" />
                      <ToolContent>
                        {(state === "input-available" || state === "approval-requested") && (
                          <ToolInput input={toolPart.input} />
                        )}
                        {state === "approval-requested" &&
                          approvalId &&
                          addToolApprovalResponse && (
                            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
                              <button
                                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-3 py-1.5 text-sm transition-colors"
                                onClick={() => {
                                  addToolApprovalResponse({
                                    id: approvalId,
                                    approved: false,
                                    reason: "User denied weather lookup",
                                  });
                                }}
                                type="button"
                              >
                                Deny
                              </button>
                              <button
                                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm transition-colors"
                                onClick={() => {
                                  addToolApprovalResponse({
                                    id: approvalId,
                                    approved: true,
                                  });
                                }}
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
              }

              // 其他工具使用通用 Tool 组件
              const toolPart = part as {
                toolCallId: string;
                state: string;
                input: Record<string, unknown>;
                output?: unknown;
                errorText?: string;
              };

              const toolName = part.type.replace("tool-", "");

              return (
                <Tool key={toolPart.toolCallId || `tool-${index}`}>
                  <ToolHeader
                    state={toolPart.state as any}
                    title={toolName}
                    type="tool-invocation"
                  />
                  <ToolContent>
                    <ToolInput input={toolPart.input} />
                    <ToolOutput errorText={toolPart.errorText} output={toolPart.output} />
                  </ToolContent>
                </Tool>
              );
            })}

        {/* 消息内容 */}
        <div className="min-w-0">
          {error && (
            <Alert variant="destructive">
              <AlertCircleIcon className="size-4" />
              <AlertTitle>chat error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {renderMessageContent(messageContent, attachments)}
          {messageData.from === "assistant" && (
            <AIMessageToolbar className="mt-4 min-w-0">
              {renderBranchSelector()}
              {!isStreamingOrRegenerating && renderActions()}
            </AIMessageToolbar>
          )}
        </div>
      </AIMessage>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.parts === nextProps.message.parts &&
      prevProps.liked === nextProps.liked &&
      prevProps.disliked === nextProps.disliked &&
      prevProps.isStreaming === nextProps.isStreaming &&
      prevProps.branchNumber === nextProps.branchNumber &&
      prevProps.branchCount === nextProps.branchCount
    );
  },
);
