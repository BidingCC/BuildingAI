import {
  type ConsoleDatasetsDocument,
  useConsoleDatasetDocumentsQuery,
} from "@buildingai/services/console";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { FileText } from "lucide-react";

import { FileFormatIcon } from "@/components/file-fomat-icons";
import { getFileFormatKey } from "@/utils/format";

export interface DocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string;
  datasetName: string;
}

export function DocumentDialog({
  open,
  onOpenChange,
  datasetId,
  datasetName,
}: DocumentDialogProps) {
  const { data, isLoading } = useConsoleDatasetDocumentsQuery(
    open ? datasetId : null,
    { page: 1, pageSize: 100 },
    { enabled: open && !!datasetId },
  );
  const items = data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-4 py-4 pr-10">
          <DialogTitle>文档 — {datasetName}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-80" viewportClassName="p-4">
          {isLoading ? (
            <div className="text-muted-foreground py-8 text-center text-sm">加载中...</div>
          ) : items.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">暂无文档</div>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((doc: ConsoleDatasetsDocument) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function DocumentRow({ doc }: { doc: ConsoleDatasetsDocument }) {
  const formatKey = getFileFormatKey(doc.fileType);
  return (
    <div className="bg-muted flex items-center gap-3 rounded-lg px-3 py-2">
      <div className="flex size-9 shrink-0 items-center justify-center">
        {formatKey ? (
          <FileFormatIcon format={formatKey} className="size-8" />
        ) : (
          <FileText className="text-muted-foreground size-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="w-90 truncate text-sm font-medium">{doc.fileName}</p>
        <p className="text-muted-foreground text-xs">
          {doc.chunkCount ?? 0} 分段 · {doc.status ?? "—"}
        </p>
      </div>
    </div>
  );
}
