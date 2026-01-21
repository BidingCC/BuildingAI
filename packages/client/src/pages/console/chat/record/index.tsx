import {
  type ConversationRecord,
  useConversationsQuery,
  useDeleteConversationMutation,
} from "@buildingai/services/console";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@buildingai/ui/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { EllipsisVertical, MessageSquare, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConversationMessages } from "./conversation-messages";

const ChatRecordIndexPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationRecord | null>(null);

  const { data, isLoading, refetch } = useConversationsQuery(
    {
      page,
      pageSize,
      keyword: keyword || undefined,
      status: status as "active" | "completed" | "failed" | "cancelled" | undefined,
    },
    {
      enabled: true,
    },
  );

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
  const total = data?.total || 0;
  const totalPages = data?.totalPages || Math.ceil(total / pageSize);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="bg-background sticky top-0 z-10 grid grid-cols-1 gap-4 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <Input
          placeholder="搜索对话标题、摘要或用户名"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={status || "all"}
          onValueChange={(value) => {
            setStatus(value === "all" ? undefined : value);
            setPage(1);
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
              <div
                key={conversation.id}
                className="group/conversation-item hover:border-primary/50 relative flex cursor-pointer flex-col gap-4 rounded-lg border p-4"
                onClick={() => handleOpenConversation(conversation)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-12 rounded-lg">
                    <AvatarImage
                      src={conversation.user?.avatar || undefined}
                      alt={conversation.user?.username || "用户"}
                    />
                    <AvatarFallback>
                      {conversation.user?.username?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="line-clamp-1 font-medium">
                      {conversation.title || "未命名对话"}
                    </span>
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
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleDelete(conversation.id)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {conversation.summary && (
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {conversation.summary}
                  </p>
                )}

                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="size-3" />
                    <span>{conversation.messageCount || 0} 条消息</span>
                  </div>
                  {conversation.totalTokens > 0 && (
                    <div>
                      <span>{conversation.totalTokens.toLocaleString()} tokens</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      conversation.status === "completed"
                        ? "default"
                        : conversation.status === "failed"
                          ? "destructive"
                          : conversation.status === "active"
                            ? "secondary"
                            : "outline"
                    }
                  >
                    {conversation.status === "active"
                      ? "进行中"
                      : conversation.status === "completed"
                        ? "已完成"
                        : conversation.status === "failed"
                          ? "失败"
                          : "已取消"}
                  </Badge>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {formatDistanceToNow(new Date(conversation.createdAt), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="bg-background sticky bottom-0 flex py-2">
          <Pagination className="mx-0 w-fit">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) setPage(page - 1);
                  }}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (page <= 4) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = page - 3 + i;
                }

                if (i === 0 && page > 4) {
                  return (
                    <>
                      <PaginationItem key="first">
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(1);
                          }}
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem key="ellipsis1">
                        <PaginationEllipsis />
                      </PaginationItem>
                    </>
                  );
                }

                if (i === 6 && page < totalPages - 3) {
                  return (
                    <>
                      <PaginationItem key="ellipsis2">
                        <PaginationEllipsis />
                      </PaginationItem>
                      <PaginationItem key="last">
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(totalPages);
                          }}
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  );
                }

                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(pageNum);
                      }}
                      isActive={page === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < totalPages) setPage(page + 1);
                  }}
                  className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

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
              <ConversationMessages
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
