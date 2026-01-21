import {
  MessageAction as AIMessageAction,
  MessageActions as AIMessageActions,
} from "@buildingai/ui/components/ai-elements/message";
import { CopyIcon, RefreshCcwIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { memo, type ReactNode } from "react";

import { MessageUsage, type MessageUsageProps } from "./message-usage";

export interface MessageActionsProps extends MessageUsageProps {
  liked: boolean;
  disliked: boolean;
  content: string;
  provider?: string;
  modelName?: string;
  onLikeChange?: (liked: boolean) => void;
  onDislikeChange?: (disliked: boolean, dislikeReason?: string, isUpdate?: boolean) => void;
  onRetry?: () => void;
  onShowFeedbackCard?: (show: boolean) => void;
  extraActions?: ReactNode;
}

export const MessageActions = memo(function MessageActions({
  liked,
  disliked,
  content,
  usage,
  userConsumedPower,
  provider,
  modelName,
  onLikeChange,
  onDislikeChange,
  onRetry,
  onShowFeedbackCard,
  extraActions,
}: MessageActionsProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  const handleLike = async () => {
    if (!onLikeChange) return;
    await onLikeChange(!liked);
  };

  const handleDislike = async () => {
    if (!onDislikeChange) return;
    await onDislikeChange(false);
    onShowFeedbackCard?.(false);
  };

  return (
    <AIMessageActions>
      {onRetry && (
        <AIMessageAction label="Retry" onClick={onRetry} tooltip="重新生成">
          <RefreshCcwIcon className="size-4" />
        </AIMessageAction>
      )}
      {onLikeChange && !disliked && (
        <AIMessageAction label="Like" onClick={handleLike} tooltip="喜欢">
          <ThumbsUpIcon className="size-4" fill={liked ? "currentColor" : "none"} />
        </AIMessageAction>
      )}
      {onDislikeChange && !liked && (
        <AIMessageAction
          label="Dislike"
          onClick={async () => {
            if (disliked) {
              await handleDislike();
            } else {
              await onDislikeChange(true);
              onShowFeedbackCard?.(true);
            }
          }}
          tooltip="不喜欢"
        >
          <ThumbsDownIcon className="size-4" fill={disliked ? "currentColor" : "none"} />
        </AIMessageAction>
      )}
      <AIMessageAction label="Copy" onClick={handleCopy} tooltip="复制">
        <CopyIcon className="size-4" />
      </AIMessageAction>
      <MessageUsage
        usage={usage}
        userConsumedPower={userConsumedPower}
        provider={provider}
        modelName={modelName}
      />
      {extraActions}
    </AIMessageActions>
  );
});
