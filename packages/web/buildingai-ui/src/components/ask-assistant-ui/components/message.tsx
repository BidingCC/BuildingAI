import {
  Message as AIMessage,
  MessageAction as AIMessageAction,
  MessageActions as AIMessageActions,
  MessageAttachment as AIMessageAttachment,
  MessageAttachments as AIMessageAttachments,
  MessageBranch as AIMessageBranch,
  MessageBranchContent as AIMessageBranchContent,
  MessageBranchNext as AIMessageBranchNext,
  MessageBranchPage as AIMessageBranchPage,
  MessageBranchPrevious as AIMessageBranchPrevious,
  MessageBranchSelector as AIMessageBranchSelector,
  MessageContent as AIMessageContent,
  MessageResponse as AIMessageResponse,
  MessageToolbar as AIMessageToolbar,
} from "@buildingai/ui/components/ai-elements/message";
import { CopyIcon, RefreshCcwIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { memo, useCallback } from "react";

export type MessageAttachmentType = {
  type: "file";
  url: string;
  mediaType?: string;
  filename?: string;
};

export type MessageVersion = {
  id: string;
  content: string;
};

export interface MessageData {
  key: string;
  from: "user" | "assistant";
  versions?: MessageVersion[];
  content?: string;
  attachments?: MessageAttachmentType[];
}

export interface MessageProps {
  message: MessageData;
  liked?: boolean;
  disliked?: boolean;
  onLikeChange?: (liked: boolean) => void;
  onDislikeChange?: (disliked: boolean) => void;
  onRetry?: () => void;
  onCopy?: (content: string) => void;
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
  }: MessageProps) => {
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

    const messageContent =
      message.versions && message.versions.length > 0
        ? message.versions[0].content
        : message.content || "";

    return (
      <AIMessage from={message.from} key={message.key}>
        {message.versions?.length && message.versions.length > 1 ? (
          <AIMessageBranch defaultBranch={0} key={message.key} className="min-w-0">
            <AIMessageBranchContent>
              {message.versions?.map((version) => (
                <AIMessageContent key={version.id}>
                  <AIMessageResponse>{version.content}</AIMessageResponse>
                </AIMessageContent>
              ))}
            </AIMessageBranchContent>
            {message.from === "assistant" && (
              <div className="mt-4 contents">
                <AIMessageToolbar className="mt-0 min-w-0">
                  <AIMessageBranchSelector from={message.from}>
                    <AIMessageBranchPrevious />
                    <AIMessageBranchPage />
                    <AIMessageBranchNext />
                  </AIMessageBranchSelector>
                  <AIMessageActions>
                    <AIMessageAction
                      label="Retry"
                      onClick={handleRetry}
                      tooltip="Regenerate response"
                    >
                      <RefreshCcwIcon className="size-4" />
                    </AIMessageAction>
                    <AIMessageAction label="Like" onClick={handleLike} tooltip="Like this response">
                      <ThumbsUpIcon className="size-4" fill={liked ? "currentColor" : "none"} />
                    </AIMessageAction>
                    <AIMessageAction
                      label="Dislike"
                      onClick={handleDislike}
                      tooltip="Dislike this response"
                    >
                      <ThumbsDownIcon
                        className="size-4"
                        fill={disliked ? "currentColor" : "none"}
                      />
                    </AIMessageAction>
                    <AIMessageAction
                      label="Copy"
                      onClick={() => handleCopy(message.versions?.find((v) => v.id)?.content || "")}
                      tooltip="Copy to clipboard"
                    >
                      <CopyIcon className="size-4" />
                    </AIMessageAction>
                  </AIMessageActions>
                </AIMessageToolbar>
              </div>
            )}
          </AIMessageBranch>
        ) : (
          <div key={message.key}>
            {message.attachments && message.attachments.length > 0 && (
              <AIMessageAttachments className="mb-2">
                {message.attachments.map((attachment) => (
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
              {message.from === "assistant" ? (
                <AIMessageResponse>{messageContent}</AIMessageResponse>
              ) : (
                messageContent
              )}
            </AIMessageContent>
            {message.from === "assistant" && message.versions && (
              <AIMessageActions>
                <AIMessageAction label="Retry" onClick={handleRetry} tooltip="Regenerate response">
                  <RefreshCcwIcon className="size-4" />
                </AIMessageAction>
                <AIMessageAction label="Like" onClick={handleLike} tooltip="Like this response">
                  <ThumbsUpIcon className="size-4" fill={liked ? "currentColor" : "none"} />
                </AIMessageAction>
                <AIMessageAction
                  label="Dislike"
                  onClick={handleDislike}
                  tooltip="Dislike this response"
                >
                  <ThumbsDownIcon className="size-4" fill={disliked ? "currentColor" : "none"} />
                </AIMessageAction>
                <AIMessageAction
                  label="Copy"
                  onClick={() => handleCopy(messageContent)}
                  tooltip="Copy to clipboard"
                >
                  <CopyIcon className="size-4" />
                </AIMessageAction>
              </AIMessageActions>
            )}
          </div>
        )}
      </AIMessage>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.message.key === nextProps.message.key &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.versions === nextProps.message.versions &&
      prevProps.message.attachments === nextProps.message.attachments &&
      prevProps.liked === nextProps.liked &&
      prevProps.disliked === nextProps.disliked
    );
  },
);
