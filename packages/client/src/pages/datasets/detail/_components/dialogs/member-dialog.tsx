import { useI18n } from "@buildingai/i18n";
import type { DatasetApplication, DatasetMember } from "@buildingai/services/web";
import {
  useApproveDatasetApplication,
  useDatasetsApplicationsQuery,
  useDatasetsMembersInfiniteQuery,
  useRejectDatasetApplication,
  useRemoveDatasetsMember,
  useUpdateDatasetsMemberRole,
} from "@buildingai/services/web";
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

export interface MemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string;
  isOwner?: boolean;
}

export function MemberDialog({
  open,
  onOpenChange,
  datasetId,
  isOwner = false,
}: MemberDialogProps) {
  const { t } = useI18n();
  const ROLE_LABEL: Record<string, string> = {
    owner: t("dataset.dialogs.member.creator"),
    manager: t("dataset.dialogs.member.manager"),
    editor: t("dataset.dialogs.member.editor"),
    viewer: t("dataset.dialogs.member.viewer"),
  };
  const ROLE_OPTIONS = [
    {
      value: "manager" as const,
      label: t("dataset.dialogs.member.managerRole"),
      desc: t("dataset.dialogs.member.managerRoleDesc"),
    },
    {
      value: "viewer" as const,
      label: t("dataset.dialogs.member.viewerRole"),
      desc: t("dataset.dialogs.member.viewerRoleDesc"),
    },
  ] as const;

  const { members, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useDatasetsMembersInfiniteQuery(datasetId, {
      enabled: open && !!datasetId,
    });
  const { data: applicationsData } = useDatasetsApplicationsQuery(datasetId, undefined, {
    enabled: open && !!datasetId,
  });

  const applications = applicationsData?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>{t("dataset.dialogs.member.title")}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="bg-muted/50 mx-4 mt-4 w-[calc(100%-2rem)] rounded-lg p-[3px]">
            <TabsTrigger value="members" className="flex-1 rounded-md">
              {t("dataset.dialogs.member.members")}
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex-1 rounded-md">
              {t("dataset.dialogs.member.applications")}
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
                <div className="text-muted-foreground py-8 text-center text-sm">
                  {t("dataset.dialogs.member.noMembers")}
                </div>
              ) : (
                members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    datasetId={datasetId}
                    canManage={isOwner}
                  />
                ))
              )}
            </InfiniteScroll>
          </TabsContent>

          <TabsContent value="applications" className="outline-none">
            <ScrollArea className="h-80">
              <div className="px-4 pb-4">
                {applications.map((app) => (
                  <ApplicationRow
                    key={app.id}
                    application={app}
                    datasetId={datasetId}
                    canManage={isOwner}
                  />
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

function MemberRow({
  member,
  datasetId,
  canManage,
}: {
  member: DatasetMember;
  datasetId: string;
  canManage: boolean;
}) {
  const isCreator = member.role === "owner";
  const displayName = member.user?.nickname ?? member.userId?.slice(0, 8) ?? "—";

  if (isCreator) {
    return (
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <ListItemAvatar name={displayName} avatar={member.user?.avatar} />
          <span className="truncate text-sm">{displayName}</span>
        </div>
        <span className="text-muted-foreground shrink-0 text-sm">
          {t("dataset.dialogs.member.creator")}
        </span>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <ListItemAvatar name={displayName} avatar={member.user?.avatar} />
          <span className="truncate text-sm">{displayName}</span>
        </div>
        <span className="text-muted-foreground shrink-0 text-sm">
          {ROLE_LABEL[member.role] ?? member.role}
        </span>
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

function MemberRolePopover({ member, datasetId }: { member: DatasetMember; datasetId: string }) {
  const updateRole = useUpdateDatasetsMemberRole(datasetId);
  const removeMember = useRemoveDatasetsMember(datasetId);
  const currentLabel = ROLE_LABEL[member.role] ?? member.role;

  const handleSelect = (value: "manager" | "viewer" | "remove") => {
    if (value === "remove") {
      removeMember.mutate(member.id);
      return;
    }
    updateRole.mutate({ memberId: member.id, params: { role: value } });
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
            <span className="text-sm font-medium">{t("dataset.dialogs.member.remove")}</span>
            <span className="text-muted-foreground text-xs">
              {t("dataset.dialogs.member.removeMember")}
            </span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ApplicationRow({
  application,
  datasetId,
  canManage,
}: {
  application: DatasetApplication;
  datasetId: string;
  canManage: boolean;
}) {
  const isPending = application.status === "pending";
  const displayName = application.user?.nickname ?? application.userId?.slice(0, 8) ?? "—";
  const approveMutation = useApproveDatasetApplication(datasetId);
  const rejectMutation = useRejectDatasetApplication(datasetId);

  const handleApprove = () => {
    approveMutation.mutate(application.id);
  };

  const handleReject = () => {
    rejectMutation.mutate({ applicationId: application.id });
  };

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ListItemAvatar name={displayName} avatar={application.user?.avatar} />
        <span className="truncate text-sm">{displayName}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isPending && canManage ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-8 px-2"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {t("dataset.dialogs.member.reject")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary h-8 px-2"
              onClick={handleApprove}
              disabled={approveMutation.isPending}
            >
              {t("dataset.dialogs.member.approve")}
            </Button>
          </>
        ) : isPending ? (
          <span className="text-muted-foreground text-sm">
            {t("dataset.dialogs.member.pending")}
          </span>
        ) : application.status === "approved" ? (
          <span className="text-muted-foreground text-sm">
            {t("dataset.dialogs.member.approved")}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">
            {t("dataset.dialogs.member.rejected")}
          </span>
        )}
      </div>
    </div>
  );
}
