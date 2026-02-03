import {
  type Dataset,
  listMyCreatedDatasets,
  listTeamDatasets,
  useBatchCopyDatasetsDocuments,
} from "@buildingai/services/web";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@buildingai/ui/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { cn } from "@buildingai/ui/lib/utils";
import { BookCopy, ChevronRight, Loader2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const PAGE_SIZE = 50;

export interface CopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceDatasetId: string;
  documentIds: string[];
  onSuccess?: () => void;
}

export function CopyDialog({
  open,
  onOpenChange,
  sourceDatasetId,
  documentIds,
  onSuccess,
}: CopyDialogProps) {
  const [myItems, setMyItems] = useState<Dataset[]>([]);
  const [teamItems, setTeamItems] = useState<Dataset[]>([]);
  const [loadingMy, setLoadingMy] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const batchCopyMutation = useBatchCopyDatasetsDocuments(sourceDatasetId);

  useEffect(() => {
    if (open) {
      setSelectedId(null);
      setLoadingMy(true);
      setLoadingTeam(true);
      listMyCreatedDatasets({ page: 1, pageSize: PAGE_SIZE })
        .then(({ items }) => setMyItems(items))
        .finally(() => setLoadingMy(false));
      listTeamDatasets({ page: 1, pageSize: PAGE_SIZE })
        .then(({ items }) => setTeamItems(items))
        .finally(() => setLoadingTeam(false));
    }
  }, [open]);

  const selectableMy = myItems.filter((d) => d.id !== sourceDatasetId);

  const handleSubmit = useCallback(() => {
    if (!selectedId || documentIds.length === 0) return;
    batchCopyMutation.mutate(
      { documentIds, targetDatasetId: selectedId },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      },
    );
  }, [selectedId, documentIds, batchCopyMutation, onOpenChange, onSuccess]);

  const pending = batchCopyMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{documentIds.length > 1 ? "批量复制文档" : "复制文档"}</DialogTitle>
          <DialogDescription>
            选择目标知识库（仅可选择自己创建的知识库）。将 {documentIds.length}{" "}
            个文档复制至目标知识库，当前知识库中的文档保留不变。
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[320px] rounded-md border">
          <div className="space-y-1 p-2">
            <Collapsible defaultOpen className="group/collapsible">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex h-9 w-full items-center justify-start gap-2 px-2 font-medium"
                >
                  <ChevronRight className="size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  <BookCopy className="size-4 shrink-0" />
                  <span className="flex-1 text-left">我的知识库</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-0.5 py-1 pr-1 pl-6">
                  {loadingMy ? (
                    <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
                      <Loader2 className="size-4 animate-spin" />
                      加载中...
                    </div>
                  ) : selectableMy.length === 0 ? (
                    <div className="text-muted-foreground py-2 text-sm">
                      暂无其他知识库，或当前知识库已是唯一
                    </div>
                  ) : (
                    selectableMy.map((d) => {
                      const isSelected = selectedId === d.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedId(d.id)}
                          className={cn(
                            "flex w-full items-center rounded-md px-2 py-2 text-left text-sm transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            isSelected && "bg-accent text-accent-foreground",
                          )}
                        >
                          <span className="line-clamp-1 flex-1">{d.name}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible defaultOpen className="group/collapsible">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex h-9 w-full items-center justify-start gap-2 px-2 font-medium"
                >
                  <ChevronRight className="size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  <Users className="size-4 shrink-0" />
                  <span className="flex-1 text-left">团队知识库</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-0.5 py-1 pr-1 pl-6">
                  {loadingTeam ? (
                    <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
                      <Loader2 className="size-4 animate-spin" />
                      加载中...
                    </div>
                  ) : teamItems.length === 0 ? (
                    <div className="text-muted-foreground py-2 text-sm">暂无</div>
                  ) : (
                    teamItems.map((d) => (
                      <div
                        key={d.id}
                        className={cn(
                          "flex w-full items-center rounded-md px-2 py-2 text-left text-sm",
                          "text-muted-foreground cursor-not-allowed opacity-70",
                        )}
                        title="仅支持复制到本人创建的知识库"
                      >
                        <span className="line-clamp-1 flex-1">{d.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={pending || !selectedId}>
            {pending ? "复制中…" : "确定"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
