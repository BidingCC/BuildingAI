import { useDatasetsConversationsQuery } from "@buildingai/services/web";
import { Button } from "@buildingai/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { cn } from "@buildingai/ui/lib/utils";
import { History } from "lucide-react";
import { useCallback, useState } from "react";

interface ChatHistoryProps {
  datasetId: string;
  currentConversationId?: string;
  onSelectConversation: (id: string | undefined) => void;
}

export function ChatHistory({
  datasetId,
  currentConversationId,
  onSelectConversation,
}: ChatHistoryProps) {
  const [open, setOpen] = useState(false);

  const { data: conversationsData } = useDatasetsConversationsQuery(
    datasetId,
    { page: 1, pageSize: 30 },
    { enabled: !!datasetId },
  );
  const conversations = conversationsData?.items ?? [];

  const handleSelect = useCallback(
    (id: string) => {
      onSelectConversation(id);
      setOpen(false);
    },
    [onSelectConversation],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" title="历史记录">
          <History className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start" side="top" sideOffset={4}>
        <ScrollArea className="h-[min(20rem,60vh)]">
          <ul className="p-1 pb-2">
            {conversations.length === 0 ? (
              <li className="text-muted-foreground px-2 py-4 text-center text-sm">暂无对话</li>
            ) : (
              conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(c.id)}
                    className={cn(
                      "hover:bg-muted w-full truncate rounded-md px-2 py-2 text-left text-sm transition-colors",
                      currentConversationId === c.id && "bg-muted",
                    )}
                    title={c.title ?? "无标题"}
                  >
                    {c.title?.trim() || "无标题"}
                  </button>
                </li>
              ))
            )}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
