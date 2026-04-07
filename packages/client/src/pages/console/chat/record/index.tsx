import { useI18n } from "@buildingai/i18n";
import {
  type ConversationRecord,
  type QueryConversationsParams,
  useConversationsQuery,
  useDeleteConversationMutation,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@buildingai/ui/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { usePagination } from "@buildingai/ui/hooks/use-pagination";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { EllipsisVertical, MessageSquare, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";

import { PageContainer } from "@/layouts/console/_components/page-container";

import {
  ConversationFeedbackStats,
  ConversationMessagesDrawer,
} from "./conversation-messages-drawer";

const PAGE_SIZE = 50;

const formatCompactNumber = (num: number): string => {
  if (num < 1000) {
    return num.toString();
  }
  if (num < 1000000) {
    const k = num / 1000;
    return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
  }
  if (num < 1000000000) {
    const m = num / 1000000;
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
  }
  const b = num / 1000000000;
  return b % 1 === 0 ? `${b}B` : `${b.toFixed(1)}B`;
};

interface ConversationCardItemProps {
  conversation: ConversationRecord;
  onOpen: (conversation: ConversationRecord) => void;
  onDelete: (id: string) => void;
}

const ConversationCardItem = ({ conversation, onOpen, onDelete }: ConversationCardItemProps) => {
  const { t } = useI18n();
  return (
    <PermissionGuard permissions="ai-conversations:get-messages" blockOnly>
      <div
        className="group/conversation-item bg-card relative flex cursor-pointer flex-col gap-2 rounded-lg border p-4"
        onClick={() => onOpen(conversation)}
      >
        <div className="flex items-center gap-3">
          <Avatar className="relative size-12 rounded-lg after:rounded-lg">
            <AvatarImage
              src={conversation.user?.avatar || ""}
              alt={conversation.user?.username || t("chat.record.user")}
              className="rounded-lg"
            />
            <AvatarFallback className="size-12 rounded-lg">
              {conversation.user?.username?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <span className="line-clamp-1 font-medium">
              {conversation.title || t("chat.record.conversation.unnamed")}
            </span>
            <span className="text-muted-foreground line-clamp-1 text-xs">
              {conversation.user?.username || t("chat.record.conversation.unknownUser")}
            </span>
          </div>

          <PermissionGuard permissions="ai-conversations:delete">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="absolute top-2 right-2" size="icon-sm" variant="ghost">
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <PermissionGuard permissions="ai-conversations:delete">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conversation.id);
                    }}
                  >
                    <Trash2 className="mr-2 size-4" />
                    {t("chat.record.delete")}
                  </DropdownMenuItem>
                </PermissionGuard>
              </DropdownMenuContent>
            </DropdownMenu>
          </PermissionGuard>
        </div>

        {conversation.summary && (
          <p className="text-muted-foreground line-clamp-2 text-sm">{conversation.summary}</p>
        )}

        <div className="text-muted-foreground flex items-center gap-4 py-3 text-xs">
          <div className="flex items-center gap-1">
            <MessageSquare className="size-3" />
            <span>
              {conversation.messageCount || 0} {t("chat.record.messages")}
            </span>
          </div>
          {conversation.totalTokens > 0 && (
            <div className="flex items-center gap-1">
              <Zap className="size-3" />
              <span>
                {formatCompactNumber(conversation.totalTokens)} {t("chat.record.tokens")}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <ConversationFeedbackStats stats={conversation.feedbackStats} compact />
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(conversation.createdAt), {
              addSuffix: true,
              locale: zhCN,
            })}
          </span>
        </div>
      </div>
    </PermissionGuard>
  );
};

const ChatRecordIndexPage = () => {
  const { t } = useI18n();
  const { confirm } = useAlertDialog();
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword] = useDebounceValue(keyword.trim(), 300);
  const [queryParams, setQueryParams] = useState<QueryConversationsParams>({
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationRecord | null>(null);

  // Update query params when debounced keyword changes
  useEffect(() => {
    setQueryParams((prev) => ({
      ...prev,
      keyword: debouncedKeyword || undefined,
      page: 1,
    }));
  }, [debouncedKeyword]);

  const { data, isLoading, refetch } = useConversationsQuery(queryParams, {
    enabled: true,
  });

  const { PaginationComponent } = usePagination({
    total: data?.total || 0,
    pageSize: PAGE_SIZE,
    page: queryParams.page || 1,
    onPageChange: (page) => {
      setQueryParams((prev) => ({ ...prev, page }));
    },
  });

  const deleteMutation = useDeleteConversationMutation({
    onSuccess: () => {
      toast.success(t("chat.record.toast.deleteSuccess"));
      refetch();
    },
    onError: (error: Error) => {
      toast.error(t("chat.record.toast.deleteFailed", { error: error.message }));
    },
  });

  const handleDelete = async (id: string) => {
    await confirm({
      title: t("chat.record.confirm.deleteTitle"),
      description: t("chat.record.confirm.deleteDescription"),
      confirmVariant: "destructive",
    });
    deleteMutation.mutate(id);
  };

  const handleOpenConversation = (conversation: ConversationRecord) => {
    setSelectedConversation(conversation);
    setSelectedConversationId(conversation.id);
  };

  const handleCloseConversation = () => {
    setSelectedConversation(null);
    setSelectedConversationId(null);
  };

  const conversations = data?.items || [];

  return (
    <PageContainer>
      <div className="flex h-full flex-col gap-4">
        <div className="bg-background sticky top-0 z-20 grid grid-cols-1 gap-4 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <Input
            placeholder={t("chat.record.searchPlaceholder")}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Select
            value={queryParams.feedbackFilter || "all"}
            onValueChange={(value) => {
              setQueryParams((prev) => ({
                ...prev,
                feedbackFilter:
                  value === "all"
                    ? undefined
                    : (value as QueryConversationsParams["feedbackFilter"]),
                page: 1,
              }));
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("chat.record.feedbackFilter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("chat.record.feedbackFilter.all")}</SelectItem>
              <SelectItem value="high-like">{t("chat.record.feedbackFilter.highLike")}</SelectItem>
              <SelectItem value="high-dislike">
                {t("chat.record.feedbackFilter.highDislike")}
              </SelectItem>
              <SelectItem value="has-feedback">
                {t("chat.record.feedbackFilter.hasFeedback")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="bg-card flex flex-col gap-2 rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-12 rounded-lg" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full" />
                  <div className="flex gap-4 py-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-12 rounded-full" />
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))
            ) : conversations.length === 0 ? (
              <div className="col-span-1 flex h-28 items-center justify-center gap-4 sm:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-5">
                <span className="text-muted-foreground text-sm">
                  {queryParams.keyword
                    ? t("chat.record.empty.noResults", { keyword: queryParams.keyword })
                    : t("chat.record.empty.noData")}
                </span>
              </div>
            ) : (
              conversations.map((conversation: ConversationRecord) => (
                <ConversationCardItem
                  key={conversation.id}
                  conversation={conversation}
                  onOpen={handleOpenConversation}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>

        <div className="bg-background sticky bottom-0 z-2 flex py-2">
          <PaginationComponent className="mx-0 w-fit" />
        </div>

        <Drawer
          open={!!selectedConversationId}
          onOpenChange={(open: boolean) => !open && handleCloseConversation()}
          direction="right"
        >
          <DrawerContent className="h-full w-full max-w-3xl! outline-none">
            <DrawerHeader>
              <DrawerTitle>
                {selectedConversation?.title || t("chat.record.conversation.unnamed")}
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                {selectedConversation?.user?.username
                  ? `${t("chat.record.drawer.userLabel")}${selectedConversation.user.username}`
                  : t("chat.record.drawer.title")}
              </DrawerDescription>
              {selectedConversation?.user?.username && (
                <div className="mt-2 flex items-center gap-2">
                  <Avatar className="size-6">
                    <AvatarImage
                      src={selectedConversation.user.avatar || undefined}
                      alt={selectedConversation.user.username}
                    />
                    <AvatarFallback>
                      {selectedConversation.user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{selectedConversation.user.username}</span>
                </div>
              )}
            </DrawerHeader>

            <div className="mt-6 flex h-[calc(100vh-8rem)] flex-col overflow-hidden">
              {selectedConversationId && (
                <ConversationMessagesDrawer
                  key={selectedConversationId}
                  conversationId={selectedConversationId}
                />
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </PageContainer>
  );
};

export default ChatRecordIndexPage;
