import { useI18n } from "@buildingai/i18n";
import {
  type Dataset,
  listMyCreatedDatasets,
  listTeamDatasets,
  useBatchCopyDatasetsDocuments,
  useBatchMoveDatasetsDocuments,
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

export interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "move" | "copy";
  sourceDatasetId: string;
  documentIds: string[];
  onSuccess?: () => void;
}

export function TransferDialog({
  open,
  onOpenChange,
  mode,
  sourceDatasetId,
  documentIds,
  onSuccess,
}: TransferDialogProps) {
  const { t } = useI18n();
  const [myItems, setMyItems] = useState<Dataset[]>([]);
  const [teamItems, setTeamItems] = useState<Dataset[]>([]);
  const [loadingMy, setLoadingMy] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const moveMutation = useBatchMoveDatasetsDocuments(sourceDatasetId);
  const copyMutation = useBatchCopyDatasetsDocuments(sourceDatasetId);
  const mutation = mode === "move" ? moveMutation : copyMutation;

  const labels = {
    move: {
      title: (n: number) =>
        n > 1
          ? t("dataset.dialogs.transfer.title.moveBatch", { count: n })
          : t("dataset.dialogs.transfer.title.move"),
      description: (n: number) => t("dataset.dialogs.transfer.description.move", { count: n }),
      pending: t("dataset.dialogs.transfer.pending"),
      teamTip: t("dataset.dialogs.transfer.teamTip"),
    },
    copy: {
      title: (n: number) =>
        n > 1
          ? t("dataset.dialogs.transfer.title.copyBatch", { count: n })
          : t("dataset.dialogs.transfer.title.copy"),
      description: (n: number) => t("dataset.dialogs.transfer.description.copy", { count: n }),
      pending: t("dataset.dialogs.transfer.pending"),
      teamTip: t("dataset.dialogs.transfer.teamTip"),
    },
  }[mode];

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
    mutation.mutate(
      { documentIds, targetDatasetId: selectedId },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      },
    );
  }, [selectedId, documentIds, mutation, onOpenChange, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.title(documentIds.length)}</DialogTitle>
          <DialogDescription>{labels.description(documentIds.length)}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[320px] rounded-md border">
          <div className="space-y-1 p-2">
            <DatasetGroup
              label={t("dataset.dialogs.transfer.myDatasets")}
              icon={<BookCopy className="size-4 shrink-0" />}
              loading={loadingMy}
              items={selectableMy}
              selectedId={selectedId}
              onSelect={setSelectedId}
              emptyText={t("dataset.dialogs.transfer.noOtherDatasets")}
            />
            <DatasetGroup
              label={t("dataset.dialogs.transfer.teamDatasets")}
              icon={<Users className="size-4 shrink-0" />}
              loading={loadingTeam}
              items={teamItems}
              disabled
              disabledTip={labels.teamTip}
            />
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("dataset.dialogs.transfer.cancel")}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={mutation.isPending || !selectedId}>
            {mutation.isPending ? labels.pending : t("dataset.dialogs.transfer.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DatasetGroup({
  label,
  icon,
  loading,
  items = [],
  selectedId,
  onSelect,
  disabled,
  disabledTip,
  emptyText = t("common.noData"),
}: {
  label: string;
  icon: React.ReactNode;
  loading: boolean;
  items?: Dataset[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  disabled?: boolean;
  disabledTip?: string;
  emptyText?: string;
}) {
  return (
    <Collapsible defaultOpen className="group/collapsible">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-9 w-full items-center justify-start gap-2 px-2 font-medium"
        >
          <ChevronRight className="size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          {icon}
          <span className="flex-1 text-left">{label}</span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-0.5 py-1 pr-1 pl-6">
          {loading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              {t("common.loading")}
            </div>
          ) : items.length === 0 ? (
            <div className="text-muted-foreground py-2 text-sm">{emptyText}</div>
          ) : disabled ? (
            items.map((d) => (
              <div
                key={d.id}
                className={cn(
                  "flex w-full items-center rounded-md px-2 py-2 text-left text-sm",
                  "text-muted-foreground cursor-not-allowed opacity-70",
                )}
                title={disabledTip}
              >
                <span className="line-clamp-1 flex-1">{d.name}</span>
              </div>
            ))
          ) : (
            items.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelect?.(d.id)}
                className={cn(
                  "flex w-full items-center rounded-md px-2 py-2 text-left text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  selectedId === d.id && "bg-accent text-accent-foreground",
                )}
              >
                <span className="line-clamp-1 flex-1">{d.name}</span>
              </button>
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
