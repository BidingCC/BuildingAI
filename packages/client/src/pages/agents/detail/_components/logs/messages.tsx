import type { AgentChatMessageItem, AgentChatRecordItem } from "@buildingai/services/web";
import {
  useAgentAnnotationDetailQuery,
  useAgentConversationMessagesQuery,
  useAgentConversationsQuery,
  useAgentDetailQuery,
  useCreateAgentAnnotationMutation,
  useDeleteAgentAnnotationMutation,
  useUpdateAgentAnnotationMutation,
} from "@buildingai/services/web";
import { MessageAction as AIMessageAction } from "@buildingai/ui/components/ai-elements/message";
import { InfiniteScrollTop } from "@buildingai/ui/components/infinite-scroll-top";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@buildingai/ui/components/ui/drawer";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@buildingai/ui/components/ui/table";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { usePagination } from "@buildingai/ui/hooks/use-pagination";
import { cn } from "@buildingai/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import {
  AlertTriangle,
  Loader2,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { FilePlusCorner, PencilLine } from "lucide-react";
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import {
  convertUIMessageToMessage,
  type DisplayMessage,
  MessageItem,
} from "@/components/ask-assistant-ui";
import { RightFloatingPanel } from "@/components/right-floating-panel";

type MessagesProps = { agentId: string };

const MESSAGES_PAGE_SIZE = 20;

/**
 * Extract text content from a UIMessage for annotation purposes.
 */
function getMessageContent(message: { message: UIMessage }): string {
  const m = convertUIMessageToMessage(message.message);
  const v = m.versions?.[m.activeVersionIndex ?? 0] ?? m.versions?.[0];
  return v?.content ?? "";
}

type AnnotationContextValue = {
  agentId: string;
  annotationIdOverrides: Record<string, string>;
  setAnnotationIdOverrides: Dispatch<SetStateAction<Record<string, string>>>;
  editAnnotationId: string | null;
  setEditAnnotationId: (id: string | null) => void;
  addingAnnotationForMessageId: string | null;
  setAddingAnnotationForMessageId: (id: string | null) => void;
  createAnnotationMutation: ReturnType<typeof useCreateAgentAnnotationMutation>;
  onAddAnnotation: (
    messageId: string,
    dbMessageId: string,
    allMessages: AgentChatMessageItem[],
  ) => void;
  onEditAnnotation: (annotationId: string) => void;
};

const AnnotationContext = createContext<AnnotationContextValue | null>(null);

function useAnnotationContext(): AnnotationContextValue | null {
  return useContext(AnnotationContext);
}

/**
 * Annotation action button for adding/editing annotations on messages.
 */
function AnnotationActions({
  messageId,
  dbMessageId,
  message,
  allMessages,
}: {
  messageId: string;
  dbMessageId: string;
  message: UIMessage;
  allMessages: AgentChatMessageItem[];
}) {
  const ctx = useAnnotationContext();
  if (!ctx) return null;
  const isQuickCommandReply = message.parts?.some((p) => p.type === "data-reply-source");
  if (isQuickCommandReply) return null;

  const metadata = message.metadata && typeof message.metadata === "object" ? message.metadata : {};
  const annotationId =
    (metadata as { annotations?: { annotationId?: string } }).annotations?.annotationId ??
    ctx.annotationIdOverrides[messageId];
  const isAdding = ctx.addingAnnotationForMessageId === messageId;

  if (annotationId && ctx.onEditAnnotation) {
    return (
      <AIMessageAction
        label="Edit annotation"
        onClick={() => ctx.onEditAnnotation(annotationId)}
        tooltip="编辑标注"
      >
        <PencilLine className="size-4" />
      </AIMessageAction>
    );
  }
  if (!annotationId && ctx.onAddAnnotation && dbMessageId) {
    return (
      <AIMessageAction
        label="Add annotation"
        onClick={() => ctx.onAddAnnotation(messageId, dbMessageId, allMessages)}
        tooltip="添加标注"
        loading={isAdding}
      >
        {!isAdding && <FilePlusCorner className="size-4" />}
      </AIMessageAction>
    );
  }
  return null;
}

/**
 * Panel for editing an existing annotation.
 */
function AnnotationEditDialog({
  agentId,
  annotationId,
  open,
  onOpenChange,
  onSaved,
  container,
}: {
  agentId: string;
  annotationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (deletedAnnotationId?: string) => void;
  container?: HTMLElement | null;
}) {
  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const { confirm: alertConfirm } = useAlertDialog();
  const { data: annotation, isLoading } = useAgentAnnotationDetailQuery(
    agentId,
    open && annotationId ? annotationId : undefined,
  );
  const updateMutation = useUpdateAgentAnnotationMutation(agentId);
  const deleteMutation = useDeleteAgentAnnotationMutation(agentId);

  useEffect(() => {
    if (annotation) {
      setFormQuestion(annotation.question ?? "");
      setFormAnswer(annotation.answer ?? "");
    }
  }, [annotation]);

  const handleSubmit = useCallback(async () => {
    if (!annotationId || !formQuestion.trim() || !formAnswer.trim()) return;
    try {
      await updateMutation.mutateAsync({
        annotationId,
        params: { question: formQuestion.trim(), answer: formAnswer.trim(), enabled: true },
      });
      toast.success("已更新");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("更新失败");
    }
  }, [annotationId, formQuestion, formAnswer, updateMutation, onOpenChange, onSaved]);

  const handleDelete = useCallback(async () => {
    if (!annotationId) return;
    try {
      await alertConfirm({
        title: "删除标注",
        description: "确定要删除此标注吗？",
        confirmText: "删除",
        confirmVariant: "destructive",
      });
    } catch {
      return;
    }
    onOpenChange(false);
    try {
      await deleteMutation.mutateAsync(annotationId);
      toast.success("已删除");
      onSaved(annotationId);
    } catch {
      toast.error("删除失败");
    }
  }, [annotationId, alertConfirm, deleteMutation, onOpenChange, onSaved]);

  return (
    <RightFloatingPanel
      open={open}
      onOpenChange={onOpenChange}
      title="编辑标注回复"
      container={container}
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending || !annotationId}
          >
            <Trash2 className="size-4" />
            删除此标注
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                updateMutation.isPending || !formQuestion.trim() || !formAnswer.trim() || isLoading
              }
              loading={updateMutation.isPending}
            >
              保存
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5 px-4 py-4">
        {isLoading ? (
          <div className="text-muted-foreground py-8 text-center text-sm">加载中…</div>
        ) : (
          <>
            <div className="grid gap-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <User className="size-4" />
                提问
              </Label>
              <Textarea
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="输入提问"
                className="bg-muted/30 min-h-[120px] resize-y rounded-lg border"
                rows={5}
              />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="size-4" />
                回复
              </Label>
              <Textarea
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                placeholder="输入回复"
                className="bg-muted/30 min-h-[160px] resize-y rounded-lg border"
                rows={6}
              />
            </div>
          </>
        )}
      </div>
    </RightFloatingPanel>
  );
}
const TABLE_PAGE_SIZE = 25;
const SORT_OPTIONS = [
  { value: "createdAt", label: "创建时间" },
  { value: "updatedAt", label: "更新时间" },
] as const;

type AgentMessageFeedback =
  | {
      type: "like";
      dislikeReason?: string;
      confidenceScore?: number;
    }
  | {
      type: "dislike";
      dislikeReason?: string;
      confidenceScore?: number;
    };

function MessageFeedbackBadge({ feedback }: { feedback?: AgentMessageFeedback | null }) {
  if (!feedback) return null;
  if (feedback.type === "like") {
    return (
      <Badge variant="default" className="gap-1">
        <ThumbsUp className="size-3" />
        <span>赞</span>
      </Badge>
    );
  }
  const confidenceScore = feedback.confidenceScore ?? 0.5;
  const opacity = Math.max(0.3, Math.min(1, confidenceScore));
  const intensity = confidenceScore > 0.7 ? "high" : confidenceScore > 0.4 ? "medium" : "low";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="destructive"
          className="gap-1"
          style={{
            opacity,
            backgroundColor: `rgba(239, 68, 68, ${opacity})`,
          }}
        >
          <ThumbsDown className="size-3" />
          <span>踩</span>
          {intensity === "high" && <AlertTriangle className="size-3" />}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-1">
          {feedback.dislikeReason && (
            <div>
              <div className="font-semibold">原因：</div>
              <div className="text-sm">{feedback.dislikeReason}</div>
            </div>
          )}
          <div className="text-muted-foreground text-xs">
            置信度: {(confidenceScore * 100).toFixed(0)}%
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function toUIMessage(m: {
  id: string;
  message?: { role?: string; parts?: unknown[]; [k: string]: unknown };
}): UIMessage {
  const stored = m.message && typeof m.message === "object" ? m.message : {};
  const parts = Array.isArray(stored.parts) ? stored.parts : [];
  const role = (stored.role as "user" | "assistant" | "system") ?? "assistant";
  return { ...stored, id: m.id, role, parts } as UIMessage;
}

function MessageListContent({
  agentId,
  conversationId,
  annotationEnabled = false,
  panelContainer,
}: {
  agentId: string;
  conversationId: string;
  annotationEnabled?: boolean;
  panelContainer?: HTMLElement | null;
}) {
  const [page, setPage] = useState(1);
  const [allMessages, setAllMessages] = useState<AgentChatMessageItem[]>([]);
  const [annotationIdOverrides, setAnnotationIdOverrides] = useState<Record<string, string>>({});
  const [editAnnotationId, setEditAnnotationId] = useState<string | null>(null);
  const [addingAnnotationForMessageId, setAddingAnnotationForMessageId] = useState<string | null>(
    null,
  );
  const prevConversationIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const createAnnotationMutation = useCreateAgentAnnotationMutation(agentId);

  const { data, isLoading, isFetching } = useAgentConversationMessagesQuery(
    agentId,
    conversationId,
    { page, pageSize: MESSAGES_PAGE_SIZE },
    { enabled: !!agentId && !!conversationId },
  );

  useEffect(() => {
    if (
      prevConversationIdRef.current !== null &&
      prevConversationIdRef.current !== conversationId
    ) {
      setPage(1);
      setAllMessages([]);
      setAnnotationIdOverrides({});
    }
    prevConversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    if (!data?.items) return;
    const reversed = [...data.items].reverse();
    if (page === 1) {
      setAllMessages(reversed);
    } else {
      setAllMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newItems = reversed.filter((item) => !existingIds.has(item.id));
        if (newItems.length === 0) return prev;
        return [...newItems, ...prev];
      });
    }
  }, [data?.items, page]);

  const isLoadingMore = isFetching && page > 1;
  const hasMore = useMemo(() => {
    if (data === undefined) return true;
    const total = data?.total ?? 0;
    return total > 0 && allMessages.length < total;
  }, [data, allMessages.length]);

  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) return;
    setPage((prev) => prev + 1);
  }, [hasMore, isLoading, isLoadingMore]);

  const onAddAnnotation = useCallback(
    (messageId: string, dbMessageId: string, msgs: AgentChatMessageItem[]) => {
      if (!dbMessageId) {
        toast.error("无法获取消息 ID");
        return;
      }
      const idx = msgs.findIndex((m) => m.id === messageId);
      if (idx <= 0) return;
      const assistantMsg = msgs[idx];
      const userMsg = msgs[idx - 1];
      const assistantUi = toUIMessage(assistantMsg);
      const userUi = toUIMessage(userMsg);
      if (userUi.role !== "user" || assistantUi.role !== "assistant") return;
      const question = getMessageContent({ message: userUi });
      const answer = getMessageContent({ message: assistantUi });
      if (!question.trim() || !answer.trim()) {
        toast.error("问题或回复为空");
        return;
      }
      setAddingAnnotationForMessageId(messageId);
      createAnnotationMutation
        .mutateAsync({
          question: question.trim(),
          answer: answer.trim(),
          messageId: dbMessageId,
          enabled: true,
        })
        .then((created) => {
          setAnnotationIdOverrides((prev) => ({ ...prev, [messageId]: created.id }));
          toast.success("已添加标注");
        })
        .catch(() => {
          toast.error("添加标注失败");
        })
        .finally(() => {
          setAddingAnnotationForMessageId(null);
        });
    },
    [createAnnotationMutation],
  );

  const onEditAnnotation = useCallback((annotationId: string) => {
    setEditAnnotationId(annotationId);
  }, []);

  const onAnnotationEditSaved = useCallback(
    (deletedAnnotationId?: string) => {
      setEditAnnotationId(null);
      if (deletedAnnotationId) {
        setAnnotationIdOverrides((prev) => {
          const next = { ...prev };
          for (const [msgId, annId] of Object.entries(next)) {
            if (annId === deletedAnnotationId) {
              delete next[msgId];
              break;
            }
          }
          return next;
        });
        queryClient.removeQueries({
          queryKey: ["agents", "annotations", agentId, "detail", deletedAnnotationId],
        });
      }
    },
    [agentId, queryClient],
  );

  const annotationContextValue = useMemo<AnnotationContextValue | null>(() => {
    if (!annotationEnabled) return null;
    return {
      agentId,
      annotationIdOverrides,
      setAnnotationIdOverrides,
      editAnnotationId,
      setEditAnnotationId,
      addingAnnotationForMessageId,
      setAddingAnnotationForMessageId,
      createAnnotationMutation,
      onAddAnnotation,
      onEditAnnotation,
    };
  }, [
    annotationEnabled,
    agentId,
    annotationIdOverrides,
    editAnnotationId,
    addingAnnotationForMessageId,
    createAnnotationMutation,
    onAddAnnotation,
    onEditAnnotation,
  ]);

  if (isLoading && page === 1 && allMessages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (
    !isLoading &&
    !isFetching &&
    allMessages.length === 0 &&
    data !== undefined &&
    (data.items?.length ?? 0) === 0
  ) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center py-12 text-sm">
        该对话暂无消息
      </div>
    );
  }

  return (
    <AnnotationContext.Provider value={annotationContextValue}>
      <AnnotationEditDialog
        agentId={agentId}
        annotationId={editAnnotationId}
        open={editAnnotationId !== null}
        onOpenChange={(open) => !open && setEditAnnotationId(null)}
        onSaved={onAnnotationEditSaved}
        container={panelContainer}
      />
      <InfiniteScrollTop
        className="chat-scroll flex h-full min-h-0 flex-col contain-[layout_style_paint]"
        prependKey={allMessages[0]?.id ?? null}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
        hideScrollToBottomButton
        initial="instant"
        resize="instant"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pt-4 pb-10">
          {allMessages.map((m, index) => {
            const uiMessage = toUIMessage(m);
            const displayMessage: DisplayMessage = {
              id: uiMessage.id,
              message: uiMessage,
              parentId: null,
              sequence: index,
              branchNumber: 0,
              branchCount: 1,
              branches: [],
              isLast: index === allMessages.length - 1,
            };
            const rawFeedback = (
              m.message as { feedback?: AgentMessageFeedback | null } | undefined
            )?.feedback;
            const isAssistant = uiMessage.role === "assistant";
            return (
              <MessageItem
                key={`${displayMessage.id}-${annotationEnabled ? "ann-on" : "ann-off"}`}
                displayMessage={displayMessage}
                isStreaming={false}
                liked={rawFeedback?.type === "like"}
                disliked={rawFeedback?.type === "dislike"}
                extraActions={
                  <>
                    {isAssistant && rawFeedback && <MessageFeedbackBadge feedback={rawFeedback} />}
                    {annotationContextValue && isAssistant && (
                      <AnnotationActions
                        messageId={displayMessage.id}
                        dbMessageId={m.id}
                        message={uiMessage}
                        allMessages={allMessages}
                      />
                    )}
                  </>
                }
              />
            );
          })}
        </div>
      </InfiniteScrollTop>
    </AnnotationContext.Provider>
  );
}

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function FeedbackCell({ record }: { record: AgentChatRecordItem }) {
  const like = record.feedbackStatus?.like ?? 0;
  const dislike = record.feedbackStatus?.dislike ?? 0;
  if (like === 0 && dislike === 0) return <span className="text-muted-foreground">-</span>;
  return (
    <div className="flex items-center gap-2">
      {like > 0 && (
        <span className="flex items-center gap-1 text-green-600">
          <ThumbsUp className="size-3.5" />
          {like}
        </span>
      )}
      {dislike > 0 && (
        <span className="flex items-center gap-1 text-red-600">
          <ThumbsDown className="size-3.5" />
          {dislike}
        </span>
      )}
    </div>
  );
}

export default function Messages({ agentId }: MessagesProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<AgentChatRecordItem | null>(null);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [drawerContainer, setDrawerContainer] = useState<HTMLDivElement | null>(null);

  const { data: agent } = useAgentDetailQuery(agentId, { enabled: !!agentId });
  const annotationEnabled = agent?.annotationConfig?.enabled ?? false;

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: TABLE_PAGE_SIZE,
      keyword: keyword.trim() || undefined,
      sortBy: sortBy as "createdAt" | "updatedAt",
      includeDebug: true,
    }),
    [page, keyword, sortBy],
  );

  const { data, isLoading: loadingConversations } = useAgentConversationsQuery(
    agentId || undefined,
    queryParams,
    { enabled: !!agentId },
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const { PaginationComponent, totalPages } = usePagination({
    total,
    pageSize: TABLE_PAGE_SIZE,
    page,
    onPageChange: setPage,
  });
  const showPagination = totalPages > 1;

  const handleRowClick = useCallback((c: AgentChatRecordItem) => {
    setSelected(c);
    setDrawerOpen(true);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    setDrawerOpen(open);
    if (!open) setSelected(null);
  }, []);

  return (
    <>
      <div className="flex h-full min-h-0 flex-col rounded-lg">
        <div className="flex shrink-0 flex-wrap items-center gap-2 pb-3">
          <Select
            value={sortBy}
            onValueChange={(v) => {
              setSortBy(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="排序" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  排序: {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="text"
            placeholder="搜索"
            value={keyword}
            className="w-70"
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-0!">
                <TableHead
                  className="bg-muted w-[14%]"
                  style={{ borderRadius: "var(--radius) 0 0 var(--radius)" }}
                >
                  标题
                </TableHead>
                <TableHead className="bg-muted w-[24%]">用户或账户</TableHead>
                <TableHead className="bg-muted w-18">消息数</TableHead>
                <TableHead className="bg-muted w-26">用户反馈</TableHead>
                <TableHead className="bg-muted w-26">积分消耗</TableHead>
                <TableHead className="bg-muted w-32">更新时间</TableHead>
                <TableHead className="bg-muted w-32 rounded-r-lg">创建时间</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {items.map((c) => (
                <TableRow
                  key={c.id}
                  className={cn("cursor-pointer", selected?.id === c.id && "bg-muted/60")}
                  onClick={() => handleRowClick(c)}
                >
                  <TableCell
                    className="max-w-[200px] truncate font-medium"
                    title={c.title ?? undefined}
                  >
                    {c.title?.trim() || "无标题"}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground text-sm"
                    title={c.userName ?? c.userId ?? c.id ?? "—"}
                  >
                    {c.anonymousIdentifier != null ? (
                      <div className="flex items-center gap-2 truncate">
                        <User className="size-4 shrink-0" />
                        <span className="min-w-0 truncate">游客</span>
                      </div>
                    ) : c.userName != null || c.userAvatar != null ? (
                      <div className="flex items-center gap-2 truncate">
                        {c.userAvatar ? (
                          <img
                            src={c.userAvatar}
                            alt=""
                            className="size-6 shrink-0 rounded-full object-cover"
                          />
                        ) : null}
                        <span className="min-w-0 truncate">{c.userName?.trim() || "—"}</span>
                      </div>
                    ) : (
                      <span className="truncate">{c.userId ?? c.id?.slice(0, 8) ?? "—"}</span>
                    )}
                  </TableCell>
                  <TableCell>{c.messageCount ?? 0}</TableCell>
                  <TableCell>
                    <FeedbackCell record={c} />
                  </TableCell>
                  <TableCell>
                    {(c.consumedPower ?? 0) > 0
                      ? "-" + (c.consumedPower ?? 0).toLocaleString()
                      : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDateTime(c.updatedAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDateTime(c.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loadingConversations && items.length === 0 && (
            <div className="flex h-full w-full flex-col items-center justify-center text-center">
              <Loader2 className="text-muted-foreground size-6 animate-spin" />
            </div>
          )}
          {items.length === 0 && !loadingConversations && (
            <div className="flex h-full w-full flex-col items-center justify-center text-center">
              <p className="text-muted-foreground">暂无数据</p>
            </div>
          )}
        </div>
        {showPagination && (
          <div className="bg-background sticky bottom-0 z-2 flex shrink-0 pt-2">
            <PaginationComponent className="mx-0 w-fit" />
          </div>
        )}
      </div>
      <Drawer open={drawerOpen} onOpenChange={handleOpenChange} direction="right">
        <DrawerContent
          ref={setDrawerContainer}
          className="bg-muted flex h-full max-w-2xl! flex-col outline-none! sm:max-w-2xl!"
        >
          <DrawerHeader className="shrink-0 px-4 py-3">
            <DrawerTitle className="flex items-center justify-between gap-3 text-base">
              <span className="min-w-0 truncate">{selected?.title?.trim() || "无标题"}</span>
              {selected && (
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <Badge variant="secondary" className="gap-1 font-normal">
                    <MessageSquare className="size-3.5" />
                    {selected.messageCount ?? 0} 条消息
                  </Badge>
                  <Badge variant="secondary" className="gap-1 font-normal">
                    <Zap className="size-3.5" />
                    {(selected.totalTokens ?? 0).toLocaleString()} tokens
                  </Badge>
                  <Badge variant="secondary" className="gap-1 font-normal">
                    {(selected.consumedPower ?? 0).toLocaleString()} 积分
                  </Badge>
                  {(selected.feedbackStatus?.like ?? 0) > 0 && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-green-200 font-normal text-green-700 dark:border-green-800 dark:text-green-400"
                    >
                      <ThumbsUp className="size-3.5" />
                      {selected.feedbackStatus?.like ?? 0}
                    </Badge>
                  )}
                  {(selected.feedbackStatus?.dislike ?? 0) > 0 && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-red-200 font-normal text-red-700 dark:border-red-800 dark:text-red-400"
                    >
                      <ThumbsDown className="size-3.5" />
                      {selected.feedbackStatus?.dislike ?? 0}
                    </Badge>
                  )}
                </div>
              )}
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex h-full min-h-0 flex-col px-1 pb-1">
            <div className="bg-background mt-0 h-full min-h-0 rounded-xl">
              {selected && agentId ? (
                <MessageListContent
                  key={selected.id}
                  agentId={agentId}
                  conversationId={selected.id}
                  annotationEnabled={annotationEnabled}
                  panelContainer={drawerContainer}
                />
              ) : null}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
