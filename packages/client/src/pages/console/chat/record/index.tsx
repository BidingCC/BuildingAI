import {
  type ConversationRecord,
  type QueryConversationsParams,
  useConversationFeedbackStatsQuery,
  useConversationsQuery,
  useDeleteConversationMutation,
} from "@buildingai/services/console";
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
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { EllipsisVertical, MessageSquare, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { usePagination } from "@/hooks/use-pagination";

import {
  ConversationFeedbackStats,
  ConversationMessagesDrawer,
} from "./conversation-messages-drawer";

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
  const { data: feedbackStats } = useConversationFeedbackStatsQuery(conversation.id, {
    enabled: !!conversation.id,
  });

  return (
    <div
      className="group/conversation-item bg-card relative flex cursor-pointer flex-col gap-2 rounded-lg border p-4"
      onClick={() => onOpen(conversation)}
    >
      <div className="flex items-center gap-3">
        <Avatar className="relative size-12 rounded-lg after:rounded-lg">
          <AvatarImage
            src={conversation.user?.avatar || ""}
            alt={conversation.user?.username || "用户"}
            className="rounded-lg"
          />
          <AvatarFallback className="size-12 rounded-lg">
            {conversation.user?.username?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <span className="line-clamp-1 font-medium">{conversation.title || "未命名对话"}</span>
          <span className="text-muted-foreground line-clamp-1 text-xs">
            {conversation.user?.username || "未知用户"}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="absolute top-2 right-2" size="icon-sm" variant="ghost">
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(conversation.id)}>
              <Trash2 className="mr-2 size-4" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {conversation.summary && (
        <p className="text-muted-foreground line-clamp-2 text-sm">{conversation.summary}</p>
      )}

      <div className="text-muted-foreground flex items-center gap-4 py-3 text-xs">
        <div className="flex items-center gap-1">
          <MessageSquare className="size-3" />
          <span>{conversation.messageCount || 0} 条消息</span>
        </div>
        {conversation.totalTokens > 0 && (
          <div className="flex items-center gap-1">
            <Zap className="size-3" />
            <span>{formatCompactNumber(conversation.totalTokens)} tokens</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <ConversationFeedbackStats stats={feedbackStats} compact />
        <span className="text-muted-foreground text-xs">
          {formatDistanceToNow(new Date(conversation.createdAt), {
            addSuffix: true,
            locale: zhCN,
          })}
        </span>
      </div>
    </div>
  );
};

const ChatRecordIndexPage = () => {
  const [queryParams, setQueryParams] = useState<QueryConversationsParams>({
    page: 1,
    pageSize: 20,
  });
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationRecord | null>(null);

  const { data, isLoading, refetch } = useConversationsQuery(queryParams, {
    enabled: true,
  });

  const { PaginationComponent } = usePagination({
    total: data?.total || 0,
    pageSize: 20,
    page: queryParams.page || 1,
    onPageChange: (page) => {
      setQueryParams((prev) => ({ ...prev, page }));
    },
  });

  const deleteMutation = useDeleteConversationMutation({
    onSuccess: () => {
      toast.success("删除成功", {
        description: "对话记录已删除",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast.error("删除失败", {
        description: error.message || "删除对话记录时发生错误",
      });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("确定要删除这条对话记录吗？")) {
      deleteMutation.mutate(id);
    }
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
    <div className="flex h-full flex-col gap-4">
      <div className="bg-background sticky top-0 z-10 grid grid-cols-1 gap-4 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <Input
          placeholder="搜索对话标题、摘要或用户名"
          value={queryParams.keyword || ""}
          onChange={(e) => {
            setQueryParams((prev) => ({
              ...prev,
              keyword: e.target.value || undefined,
              page: 1,
            }));
          }}
        />
        <Select
          value={queryParams.status || "all"}
          onValueChange={(value) => {
            setQueryParams((prev) => ({
              ...prev,
              status: value === "all" ? undefined : (value as QueryConversationsParams["status"]),
              page: 1,
            }));
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="选择状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">进行中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={queryParams.feedbackFilter || "all"}
          onValueChange={(value) => {
            setQueryParams((prev) => ({
              ...prev,
              feedbackFilter:
                value === "all" ? undefined : (value as QueryConversationsParams["feedbackFilter"]),
              page: 1,
            }));
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="反馈筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部反馈</SelectItem>
            <SelectItem value="high-like">高赞率</SelectItem>
            <SelectItem value="high-dislike">高踩率</SelectItem>
            <SelectItem value="has-feedback">有反馈</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">暂无对话记录</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {conversations.map((conversation: ConversationRecord) => (
              <ConversationCardItem
                key={conversation.id}
                conversation={conversation}
                onOpen={handleOpenConversation}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <div className="bg-background sticky bottom-0 flex py-2">
        <PaginationComponent className="mx-0 w-fit" />
      </div>

      <Drawer
        open={!!selectedConversationId}
        onOpenChange={(open: boolean) => !open && handleCloseConversation()}
        direction="right"
      >
        <DrawerContent className="h-full w-full max-w-3xl! outline-none">
          <DrawerHeader>
            <DrawerTitle>{selectedConversation?.title || "未命名对话"}</DrawerTitle>
            <DrawerDescription className="sr-only">
              {selectedConversation?.user?.username
                ? `对话用户：${selectedConversation.user.username}`
                : "对话详情"}
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
  );
};

export default ChatRecordIndexPage;
