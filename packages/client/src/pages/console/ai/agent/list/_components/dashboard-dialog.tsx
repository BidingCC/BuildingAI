import type { ConsoleAgentItem } from "@buildingai/services/console";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";

import { useI18n } from "@buildingai/i18n";
import { AgentDashboardPanel } from "@/pages/console/ai/agent/list/_components/agent-dashboard-panel";

type DashboardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: ConsoleAgentItem | null;
};

export function DashboardDialog({ open, onOpenChange, agent }: DashboardDialogProps) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl!">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>
            {agent
              ? `${agent.name} · ${t("ai.agent.dashboard.title")}`
              : t("ai.agent.dashboard.title")}
          </DialogTitle>
          <DialogDescription>{t("ai.agent.dashboard.description")}</DialogDescription>
        </DialogHeader>
        {open && agent ? (
          <ScrollArea className="max-h-[70vh] min-h-0 flex-1 pb-2">
            <AgentDashboardPanel agentId={agent.id} source="console" showTitle={false} />
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
