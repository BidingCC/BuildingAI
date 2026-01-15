"use client";

import { Button } from "@buildingai/ui/components/ui/button";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import { cn } from "@buildingai/ui/lib/utils";
import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

type MaybePromise<T> = T | Promise<T>;

export type ChatListProps = Omit<ComponentProps<typeof StickToBottom>, "children"> & {
  /** Chat messages / items */
  children: ReactNode;
  /** Print debug logs in devtools console */
  debug?: boolean;
  /**
   * Used to detect "prepend happened" and trigger scroll retention.
   * Pass something that changes when you prepend older messages, e.g. `oldestMessageId`.
   */
  prependKey?: string | number | null;
  /** Whether there is more history to load */
  hasMore?: boolean;
  /** Whether currently loading more history */
  isLoadingMore?: boolean;
  /** Called when user reaches top (load older messages). */
  onLoadMore?: () => MaybePromise<void>;
  /** Trigger distance from top (px). */
  topThreshold?: number;
  /** Top loading indicator (defaults to spinner). */
  topLoadingSlot?: ReactNode;
  /** Hide built-in "scroll to bottom" button */
  hideScrollToBottomButton?: boolean;
};

// Per requirement: do NOT retain scroll position on prepend.
// We only stop any ongoing stick-to-bottom animation before loading more.
function usePrependNoRetention() {
  const { stopScroll } = useStickToBottomContext();
  const beginTxn = useCallback(() => {
    stopScroll();
  }, [stopScroll]);
  return useMemo(() => ({ beginTxn }), [beginTxn]);
}

function TopLoadSentinel({
  hasMore,
  isLoadingMore,
  onLoadMore,
  topThreshold = 0,
  onBeforeLoadMore,
  debug = false,
}: {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore?: () => MaybePromise<void>;
  topThreshold?: number;
  onBeforeLoadMore: () => void;
  debug?: boolean;
}) {
  const { scrollRef } = useStickToBottomContext();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({
    hasMore,
    isLoadingMore,
    onLoadMore,
    topThreshold,
    debug,
    onBeforeLoadMore,
    locked: false,
    hasUserScrolled: false,
    observer: null as IntersectionObserver | null,
  });

  // Update refs without causing re-renders
  useEffect(() => {
    stateRef.current.hasMore = hasMore;
    stateRef.current.isLoadingMore = isLoadingMore;
    stateRef.current.onLoadMore = onLoadMore;
    stateRef.current.topThreshold = topThreshold;
    stateRef.current.debug = debug;
    stateRef.current.onBeforeLoadMore = onBeforeLoadMore;
  }, [hasMore, isLoadingMore, onLoadMore, topThreshold, debug, onBeforeLoadMore]);

  // Unlock when loading completes
  useEffect(() => {
    if (!isLoadingMore && stateRef.current.locked) {
      stateRef.current.locked = false;
    }
  }, [isLoadingMore]);

  // IntersectionObserver for top-load trigger
  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const state = stateRef.current;

    // Mark user has scrolled after initial mount
    let hasMarkedUserScrolled = false;
    const markUserScrolled = () => {
      if (!hasMarkedUserScrolled) {
        hasMarkedUserScrolled = true;
        state.hasUserScrolled = true;
      }
    };

    // Track scroll to detect user interaction and enforce non-zero top
    const scrollHandler = () => {
      markUserScrolled();
      // Enforce non-zero top when hasMore
      if (state.hasMore && root.scrollTop === 0) {
        root.scrollTop = 1;
      }
    };
    root.addEventListener("scroll", scrollHandler, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;

        const s = stateRef.current;

        // Enforce non-zero top when hasMore
        if (s.hasMore && root.scrollTop === 0) {
          root.scrollTop = 1;
        }

        // Skip if conditions not met
        if (!s.hasMore || s.isLoadingMore || !s.onLoadMore || s.locked) return;

        // Skip if user hasn't scrolled yet (avoid initial auto-trigger)
        if (!s.hasUserScrolled) return;

        // Skip if content is not scrollable
        if (root.scrollHeight <= root.clientHeight + 8) return;

        s.locked = true;

        s.onBeforeLoadMore();
        void Promise.resolve(s.onLoadMore()).catch(() => {});
      },
      {
        root,
        rootMargin: `${topThreshold}px 0px 0px 0px`,
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    state.observer = observer;

    return () => {
      root.removeEventListener("scroll", scrollHandler);
      observer.disconnect();
      state.observer = null;
    };
  }, [scrollRef, topThreshold]);

  return <div ref={sentinelRef} className="absolute top-0 h-px w-full" />;
}

export function ChatList({
  className,
  children,
  prependKey,
  hasMore = true,
  isLoadingMore = false,
  onLoadMore,
  topThreshold = 0,
  topLoadingSlot,
  hideScrollToBottomButton,
  debug = false,
  initial = "instant",
  resize = "instant",
  ...props
}: ChatListProps) {
  return (
    <StickToBottom
      className={cn("relative flex-1 overflow-y-hidden", className)}
      initial={initial}
      resize={resize}
      role="log"
      {...props}
    >
      <ChatListInner
        prependKey={prependKey}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={onLoadMore}
        topThreshold={topThreshold}
        topLoadingSlot={topLoadingSlot}
        hideScrollToBottomButton={hideScrollToBottomButton}
        debug={debug}
      >
        {children}
      </ChatListInner>
    </StickToBottom>
  );
}

function ChatListInner({
  children,
  prependKey: _prependKey,
  hasMore,
  isLoadingMore,
  onLoadMore,
  topThreshold,
  topLoadingSlot,
  hideScrollToBottomButton,
  debug,
}: Pick<
  ChatListProps,
  | "children"
  | "prependKey"
  | "hasMore"
  | "isLoadingMore"
  | "onLoadMore"
  | "topThreshold"
  | "topLoadingSlot"
  | "hideScrollToBottomButton"
  | "debug"
>) {
  const { beginTxn } = usePrependNoRetention();

  return (
    <>
      <StickToBottom.Content className="relative flex min-h-full scale-y-[-1] flex-col gap-4">
        <div className="scale-y-[-1]">{children}</div>

        {onLoadMore && (
          <div className="sticky top-0 scale-y-[-1]">
            <TopLoadSentinel
              hasMore={!!hasMore}
              isLoadingMore={!!isLoadingMore}
              onLoadMore={onLoadMore}
              topThreshold={topThreshold}
              onBeforeLoadMore={beginTxn}
              debug={debug}
            />
            {
              <div
                className={cn(
                  "flex w-full items-center justify-center py-2",
                  isLoadingMore ? "opacity-100" : "opacity-0",
                )}
              >
                {topLoadingSlot ?? <Spinner className="text-muted-foreground size-5" />}
              </div>
            }
          </div>
        )}
      </StickToBottom.Content>

      {!hideScrollToBottomButton && <ChatListScrollButton className="bottom-4" />}
    </>
  );
}

export type ChatListScrollButtonProps = ComponentProps<typeof Button>;

export function ChatListScrollButton({ className, ...props }: ChatListScrollButtonProps) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  const handleScrollToBottom = useCallback(() => {
    void scrollToBottom();
  }, [scrollToBottom]);

  return (
    !isAtBottom && (
      <Button
        className={cn("absolute left-1/2 -translate-x-1/2 rounded-full", className)}
        onClick={handleScrollToBottom}
        size="icon"
        type="button"
        variant="outline"
        {...props}
      >
        <ArrowDownIcon className="size-4" />
      </Button>
    )
  );
}
