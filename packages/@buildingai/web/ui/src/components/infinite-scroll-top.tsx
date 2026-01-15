"use client";

import { Button } from "@buildingai/ui/components/ui/button";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import { cn } from "@buildingai/ui/lib/utils";
import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

type MaybePromise<T> = T | Promise<T>;

export type InfiniteScrollTopProps = Omit<ComponentProps<typeof StickToBottom>, "children"> & {
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
  /** Force full height when content is minimal (e.g., empty state) */
  forceFullHeight?: boolean;
};

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

  useEffect(() => {
    stateRef.current.hasMore = hasMore;
    stateRef.current.isLoadingMore = isLoadingMore;
    stateRef.current.onLoadMore = onLoadMore;
    stateRef.current.topThreshold = topThreshold;
    stateRef.current.debug = debug;
    stateRef.current.onBeforeLoadMore = onBeforeLoadMore;
  }, [hasMore, isLoadingMore, onLoadMore, topThreshold, debug, onBeforeLoadMore]);

  useEffect(() => {
    if (!isLoadingMore && stateRef.current.locked) {
      stateRef.current.locked = false;
    }
  }, [isLoadingMore]);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const state = stateRef.current;

    let hasMarkedUserScrolled = false;
    const markUserScrolled = () => {
      if (!hasMarkedUserScrolled) {
        hasMarkedUserScrolled = true;
        state.hasUserScrolled = true;
      }
    };

    const scrollHandler = () => {
      markUserScrolled();
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

        if (s.hasMore && root.scrollTop === 0) {
          root.scrollTop = 1;
        }

        if (!s.hasMore || s.isLoadingMore || !s.onLoadMore || s.locked) return;

        if (!s.hasUserScrolled) return;

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

export function InfiniteScrollTop({
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
  forceFullHeight = false,
  ...props
}: InfiniteScrollTopProps) {
  return (
    <StickToBottom
      className={cn("relative flex-1 overflow-y-hidden", className)}
      initial={initial}
      resize={resize}
      role="log"
      {...props}
    >
      <InfiniteScrollTopInner
        prependKey={prependKey}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={onLoadMore}
        topThreshold={topThreshold}
        topLoadingSlot={topLoadingSlot}
        hideScrollToBottomButton={hideScrollToBottomButton}
        debug={debug}
        forceFullHeight={forceFullHeight}
      >
        {children}
      </InfiniteScrollTopInner>
    </StickToBottom>
  );
}

function InfiniteScrollTopInner({
  children,
  prependKey: _prependKey,
  hasMore,
  isLoadingMore,
  onLoadMore,
  topThreshold,
  topLoadingSlot,
  hideScrollToBottomButton,
  debug,
  forceFullHeight,
}: Pick<
  InfiniteScrollTopProps,
  | "children"
  | "prependKey"
  | "hasMore"
  | "isLoadingMore"
  | "onLoadMore"
  | "topThreshold"
  | "topLoadingSlot"
  | "hideScrollToBottomButton"
  | "debug"
  | "forceFullHeight"
>) {
  const { beginTxn } = usePrependNoRetention();

  return (
    <>
      <StickToBottom.Content
        className={cn(
          "relative flex scale-y-[-1] flex-col gap-4",
          forceFullHeight ? "h-full" : "min-h-full",
        )}
      >
        <div className="flex h-full min-h-0 scale-y-[-1] flex-col">{children}</div>

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

      {!hideScrollToBottomButton && <InfiniteScrollTopScrollButton className="bottom-4" />}
    </>
  );
}

export type InfiniteScrollTopScrollButtonProps = ComponentProps<typeof Button>;

export function InfiniteScrollTopScrollButton({
  className,
  ...props
}: InfiniteScrollTopScrollButtonProps) {
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
