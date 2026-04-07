import { useI18n } from "@buildingai/i18n";
import { type McpServer, useMcpServerQuery } from "@buildingai/services/console";
import { Badge } from "@buildingai/ui/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { Hammer } from "lucide-react";
import { useEffect, useState } from "react";

type McpToolsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: McpServer | null;
};

export const McpToolsDialog = ({ open, onOpenChange, server }: McpToolsDialogProps) => {
  const { t } = useI18n();
  const [localServer, setLocalServer] = useState<McpServer | null>(server);

  useEffect(() => {
    if (open && server) {
      setLocalServer(server);
      return;
    }
    if (!open) {
      const t = window.setTimeout(() => setLocalServer(null), 200);
      return () => window.clearTimeout(t);
    }
  }, [open, server]);

  const { data, isLoading } = useMcpServerQuery(localServer?.id ?? "", {
    enabled: open && !!localServer?.id,
  });

  const tools = data?.tools ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Hammer className="size-4" />
            {localServer?.name} - {t("mcp.tools.title")}
          </DialogTitle>
          <DialogDescription>{t("mcp.tools.count", { count: isLoading ? "..." : tools.length })}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="flex flex-col gap-2 p-4 pt-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex flex-col gap-2 rounded-lg border p-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))
            ) : tools.length > 0 ? (
              tools.map((tool) => (
                <div key={tool.id} className="flex flex-col gap-1.5 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {tool.name}
                    </Badge>
                  </div>
                  {tool.description && (
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {tool.description}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-muted-foreground flex h-24 items-center justify-center text-sm">
                {t("mcp.tools.noData")}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
