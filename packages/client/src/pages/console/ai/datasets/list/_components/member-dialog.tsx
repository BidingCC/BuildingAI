import type { ConsoleDatasetApplication, ConsoleDatasetMember } from "@buildingai/services/console";
import {
  useConsoleApproveDatasetApplicationMutation,
  useConsoleDatasetApplicationsQuery,
  useConsoleDatasetMembersInfiniteQuery,
  useConsoleRejectDatasetApplicationMutation,
  useConsoleRemoveDatasetMemberMutation,
  useConsoleUpdateDatasetMemberRoleMutation,
} from "@buildingai/services/console";
import { InfiniteScroll } from "@buildingai/ui/components/infinite-scroll";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { ChevronDownIcon } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  owner: "创建者",
  manager: "管理员",
  editor: "编辑者",
  viewer: "普通成员",
};

const ROLE_OPTIONS = [
  { value: "manager" as const, label: "管理员", desc: "可预览、提问、编辑此知识库" },
  { value: "viewer" as const, label: "普通成员", desc: "可预览、提问此知识库" },
] as const;

export interface MemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string;
  datasetName?: string;
}

export function MemberDialog({ open, onOpenChange, datasetId, datasetName }: MemberDialogProps) {
  const { members, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useConsoleDatasetMembersInfiniteQuery(open ? datasetId : null, {
      enabled: open && !!datasetId,
    });
  const { data: applicationsData } = useConsoleDatasetApplicationsQuery(
    open ? datasetId : null,
    undefined,
    { enabled: open && !!datasetId },
  );
  const applications = applicationsData?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>成员管理{datasetName ? ` — ${datasetName}` : ""}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="bg-muted/50 mx-4 mt-4 w-[calc(100%-2rem)] rounded-lg p-[3px]">
            <TabsTrigger value="members" className="flex-1 rounded-md">
              成员
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex-1 rounded-md">
              申请
            </TabsTrigger>
          </TabsList>
          <TabsContent value="members" className="outline-none">
            <InfiniteScroll
              className="h-80 overflow-y-auto px-4 pb-4"
              loading={isFetchingNextPage}
              hasMore={!!hasNextPage}
              showEmptyText={false}
              onLoadMore={() => fetchNextPage()}
            >
              {members.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-sm">暂无成员</div>
              ) : (
                members.map((member) => (
                  <MemberRow key={member.id} member={member} datasetId={datasetId} />
                ))
              )}
            </InfiniteScroll>
          </TabsContent>
          <TabsContent value="applications" className="outline-none">
            <ScrollArea className="h-80">
              <div className="px-4 pb-4">
                {applications.map((app) => (
                  <ApplicationRow key={app.id} application={app} datasetId={datasetId} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ListItemAvatar({ name, avatar }: { name: string; avatar?: string }) {
  return (
    <Avatar className="size-9 shrink-0 rounded-full">
      <AvatarImage src={avatar} />
      <AvatarFallback className="rounded-full text-xs">{name.slice(0, 2)}</AvatarFallback>
    </Avatar>
  );
}

function MemberRow({ member, datasetId }: { member: ConsoleDatasetMember; datasetId: string }) {
  const isCreator = member.role === "owner";
  const displayName = member.user?.nickname ?? member.userId?.slice(0, 8) ?? "—";

  if (isCreator) {
    return (
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <ListItemAvatar name={displayName} avatar={member.user?.avatar} />
          <span className="truncate text-sm">{displayName}</span>
        </div>
        <span className="text-muted-foreground shrink-0 text-sm">创建者</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ListItemAvatar name={displayName} avatar={member.user?.avatar} />
        <span className="truncate text-sm">{displayName}</span>
      </div>
      <div className="shrink-0">
        <MemberRolePopover member={member} datasetId={datasetId} />
      </div>
    </div>
  );
}

function MemberRolePopover({
  member,
  datasetId,
}: {
  member: ConsoleDatasetMember;
  datasetId: string;
}) {
  const updateRole = useConsoleUpdateDatasetMemberRoleMutation(datasetId);
  const removeMember = useConsoleRemoveDatasetMemberMutation(datasetId);
  const currentLabel = ROLE_LABEL[member.role] ?? member.role;

  const handleSelect = (value: "manager" | "viewer" | "remove") => {
    if (value === "remove") {
      removeMember.mutate(member.id);
      return;
    }
    updateRole.mutate({ memberId: member.id, role: value });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-8 gap-1 px-2 font-normal"
        >
          {currentLabel}
          <ChevronDownIcon className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="py-1">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="hover:bg-muted/50 flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left"
              onClick={() => handleSelect(opt.value)}
            >
              <span className="text-sm font-medium">{opt.label}</span>
              <span className="text-muted-foreground text-xs">{opt.desc}</span>
            </button>
          ))}
          <button
            type="button"
            className="hover:bg-muted/50 flex w-full flex-col items-start gap-0.5 border-t px-3 py-2 text-left"
            onClick={() => handleSelect("remove")}
          >
            <span className="text-sm font-medium">移除</span>
            <span className="text-muted-foreground text-xs">移除该成员</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ApplicationRow({
  application,
  datasetId,
}: {
  application: ConsoleDatasetApplication;
  datasetId: string;
}) {
  const isPending = application.status === "pending";
  const displayName = application.user?.nickname ?? application.userId?.slice(0, 8) ?? "—";
  const approveMutation = useConsoleApproveDatasetApplicationMutation(datasetId);
  const rejectMutation = useConsoleRejectDatasetApplicationMutation(datasetId);

  const handleApprove = () => approveMutation.mutate(application.id);
  const handleReject = () => rejectMutation.mutate({ applicationId: application.id });

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ListItemAvatar name={displayName} avatar={application.user?.avatar} />
        <span className="truncate text-sm">{displayName}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isPending ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-8 px-2"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              拒绝
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary h-8 px-2"
              onClick={handleApprove}
              disabled={approveMutation.isPending}
            >
              通过
            </Button>
          </>
        ) : application.status === "approved" ? (
          <span className="text-muted-foreground text-sm">已通过</span>
        ) : (
          <span className="text-muted-foreground text-sm">已拒绝</span>
        )}
      </div>
    </div>
  );
}
