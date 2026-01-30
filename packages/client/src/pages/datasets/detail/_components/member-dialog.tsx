import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";

export interface MemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MOCK_MEMBERS = [
  { id: "1", name: "用户 1937822", avatar: undefined, role: "admin" as const },
  { id: "2", name: "自信阿德勒", avatar: undefined, role: "member" as const },
  { id: "3", name: "小橘子_888", avatar: undefined, role: "creator" as const },
];

const MOCK_APPLICATIONS = [
  { id: "a1", name: "用户1937822", avatar: undefined, status: "pending" as const },
  { id: "a2", name: "自信阿德勒", avatar: undefined, status: "pending" as const },
  { id: "a3", name: "用户53252352", avatar: undefined, status: "approved" as const },
];

function ListItemAvatar({ name, avatar }: { name: string; avatar?: string }) {
  return (
    <Avatar className="size-9 shrink-0 rounded-full">
      <AvatarImage src={avatar} />
      <AvatarFallback className="rounded-full text-xs">{name.slice(0, 2)}</AvatarFallback>
    </Avatar>
  );
}

function MemberRow({ member }: { member: (typeof MOCK_MEMBERS)[number] }) {
  const isCreator = member.role === "creator";
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ListItemAvatar name={member.name} avatar={member.avatar} />
        <span className="truncate text-sm">{member.name}</span>
      </div>
      <div className="shrink-0">
        {isCreator ? (
          <span className="text-muted-foreground text-sm">创建者</span>
        ) : (
          <Select defaultValue={member.role} onValueChange={() => {}}>
            <SelectTrigger className="h-8 w-20 border-0 bg-transparent shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">管理员</SelectItem>
              <SelectItem value="member">普通成员</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

function ApplicationRow({ app }: { app: (typeof MOCK_APPLICATIONS)[number] }) {
  const isPending = app.status === "pending";
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ListItemAvatar name={app.name} avatar={app.avatar} />
        <span className="truncate text-sm">{app.name}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isPending ? (
          <>
            <Button variant="ghost" size="sm" className="text-muted-foreground h-8 px-2">
              拒绝
            </Button>
            <Button variant="ghost" size="sm" className="text-primary h-8 px-2">
              通过
            </Button>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">已同意</span>
        )}
      </div>
    </div>
  );
}

export function MemberDialog({ open, onOpenChange }: MemberDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>新增成员</DialogTitle>
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
            <ScrollArea className="max-h-150">
              <div className="px-4 pb-4">
                {MOCK_MEMBERS.map((member) => (
                  <MemberRow key={member.id} member={member} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="applications" className="outline-none">
            <ScrollArea className="max-h-150">
              <div className="px-4 pb-4">
                {MOCK_APPLICATIONS.map((app) => (
                  <ApplicationRow key={app.id} app={app} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
