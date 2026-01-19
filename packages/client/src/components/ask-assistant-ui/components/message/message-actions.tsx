import {
  MessageAction as AIMessageAction,
  MessageActions as AIMessageActions,
} from "@buildingai/ui/components/ai-elements/message";
import { CopyIcon, RefreshCcwIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { memo } from "react";

import { MessageUsage, type MessageUsageProps } from "./message-usage";

export interface MessageActionsProps extends MessageUsageProps {
  liked: boolean;
  disliked: boolean;
  content: string;
  onLikeChange?: (liked: boolean) => void;
  onDislikeChange?: (disliked: boolean) => void;
  onRetry?: () => void;
}

export const MessageActions = memo(function MessageActions({
  liked,
  disliked,
  content,
  usage,
  onLikeChange,
  onDislikeChange,
  onRetry,
}: MessageActionsProps) {
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
      <MessageUsage usage={usage} />
    </AIMessageActions>
  );
});
