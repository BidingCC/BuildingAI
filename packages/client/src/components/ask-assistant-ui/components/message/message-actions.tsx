import {
  MessageAction as AIMessageAction,
  MessageActions as AIMessageActions,
} from "@buildingai/ui/components/ai-elements/message";
import {
  CopyCheck,
  CopyIcon,
  Loader2,
  RefreshCcwIcon,
  Square,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Volume2Icon,
} from "lucide-react";
import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { useI18n } from "@buildingai/i18n";
import { MessageContext } from "./message-context";
import { MessageUsage, type MessageUsageProps } from "./message-usage";

export interface MessageActionsProps extends MessageUsageProps {
  messageId?: string;
  liked: boolean;
  disliked: boolean;
  content: string;
  errorMessage?: string;
  conversationContext?: Array<{ role: string; content: string }>;
  provider?: string;
  modelName?: string;
  onLikeChange?: (liked: boolean) => void;
  onDislikeChange?: (disliked: boolean, dislikeReason?: string, isUpdate?: boolean) => void;
  onRetry?: () => void;
  onShowFeedbackCard?: (show: boolean) => void;
  onSpeak?: (
    text: string,
    options?: { onReady?: (stop: () => void) => void },
  ) => void | Promise<void>;
  extraActions?: ReactNode;
}

export const MessageActions = memo(function MessageActions({
  messageId,
  liked,
  disliked,
  content,
  errorMessage,
  usage,
  conversationContext,
  userConsumedPower,
  provider,
  modelName,
  onLikeChange,
  onDislikeChange,
  onRetry,
  onShowFeedbackCard,
  onSpeak,
  extraActions,
}: MessageActionsProps) {
  const { t } = useI18n();
  const [isCopied, setIsCopied] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const ttsStopRef = useRef<(() => void) | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasValidMessageId = !!messageId;

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleSpeakClick = useCallback(async () => {
    if (!onSpeak || !content.trim()) return;
    if (isTtsPlaying && ttsStopRef.current) {
      ttsStopRef.current();
      ttsStopRef.current = null;
      setIsTtsPlaying(false);
      return;
    }
    if (isTtsLoading) return;
    setIsTtsLoading(true);
    try {
      await onSpeak(content, {
        onReady: (stop) => {
          ttsStopRef.current = stop;
          setIsTtsLoading(false);
          setIsTtsPlaying(true);
        },
      });
    } finally {
      setIsTtsLoading(false);
      setIsTtsPlaying(false);
      ttsStopRef.current = null;
    }
  }, [onSpeak, content, isTtsLoading, isTtsPlaying]);

  const handleCopy = () => {
    const copyContent = errorMessage || content || "";
    navigator.clipboard.writeText(copyContent);
    setIsCopied(true);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => setIsCopied(false), 2000);
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
        <AIMessageAction label={t("action.regenerate")} onClick={onRetry} tooltip={t("action.regenerate")}>
          <RefreshCcwIcon className="size-4" />
        </AIMessageAction>
      )}
      {hasValidMessageId && onLikeChange && !disliked && (
        <AIMessageAction label={t("action.like")} onClick={handleLike} tooltip={t("action.like")}>
          <ThumbsUpIcon className="size-4" fill={liked ? "currentColor" : "none"} />
        </AIMessageAction>
      )}
      {hasValidMessageId && onDislikeChange && !liked && (
        <AIMessageAction
          label={t("action.dislike")}
          onClick={async () => {
            if (disliked) {
              await handleDislike();
            } else {
              await onDislikeChange(true);
              onShowFeedbackCard?.(true);
            }
          }}
          tooltip={t("action.dislike")}
        >
          <ThumbsDownIcon className="size-4" fill={disliked ? "currentColor" : "none"} />
        </AIMessageAction>
      )}
      <AIMessageAction label={t("action.copy")} onClick={handleCopy} tooltip={isCopied ? t("action.copied") : t("action.copy")}>
        {isCopied ? <CopyCheck className="size-4" /> : <CopyIcon className="size-4" />}
      </AIMessageAction>
      {onSpeak && content.trim() && (
        <AIMessageAction
          label={isTtsPlaying ? t("action.stopSpeaking") : t("action.speak")}
          onClick={handleSpeakClick}
          tooltip={isTtsLoading ? t("action.synthesizing") : isTtsPlaying ? t("action.stopSpeaking") : t("action.speak")}
        >
          {isTtsLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isTtsPlaying ? (
            <Square className="size-4" />
          ) : (
            <Volume2Icon className="size-4" />
          )}
        </AIMessageAction>
      )}
      <MessageUsage
        usage={usage}
        userConsumedPower={userConsumedPower}
        provider={provider}
        modelName={modelName}
      />
      {conversationContext?.length ? <MessageContext messages={conversationContext} /> : null}
      {extraActions}
    </AIMessageActions>
  );
});
