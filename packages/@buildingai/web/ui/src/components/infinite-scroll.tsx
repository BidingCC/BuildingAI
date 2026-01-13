import { CSSProperties, type ReactNode, useEffect, useRef } from "react";

interface InfiniteScrollProps {
    /** 子元素 */
    children: ReactNode;
    /** 是否正在加载 */
    loading?: boolean;
    /** 是否还有更多数据 */
    hasMore?: boolean;
    /** 触发加载的距离，单位为像素 @default 100 */
    threshold?: number;
    /** 加载更多的回调函数 */
    onLoadMore: () => void;
    /** 容器的类名 */
    className?: string;
    /** 容器的样式 */
    style?: CSSProperties;
    /** 空状态文本 */
    emptyText?: string;
}

/**
 * 下滑加载组件
 * 当滚动到距离底部指定距离时，触发加载事件
 */
export function InfiniteScroll({
    children,
    loading = false,
    hasMore = true,
    threshold = 100,
    onLoadMore,
    className,
    style,
    emptyText = "没有更多数据了",
}: InfiniteScrollProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const observer = useRef<IntersectionObserver | null>(null);
    const loadingRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        const loadingElement = loadingRef.current;

        if (!container || !loadingElement || !hasMore || loading) return;

        // 创建 IntersectionObserver 实例
        observer.current = new IntersectionObserver(
            (entries) => {
                // 当观察的元素进入视口时触发加载
                if (entries[0]?.isIntersecting) {
                    onLoadMore();
                }
            },
            {
                root: null, // 使用视口作为根
                rootMargin: `${threshold}px`, // 设置触发距离
                threshold: 0, // 当目标元素的任何部分可见时触发
            },
        );

        // 开始观察加载元素
        observer.current.observe(loadingElement);

        return () => {
            if (observer.current) {
                observer.current.disconnect();
            }
        };
    }, [hasMore, loading, onLoadMore, threshold]);

    return (
        <div ref={containerRef} className={className} style={style}>
            {children}
            <div ref={loadingRef} className="flex h-8 w-full items-center justify-center">
                {loading && hasMore && (
                    <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
                )}
                {!hasMore && <div className="text-muted-foreground text-sm">{emptyText}</div>}
            </div>
        </div>
    );
}
