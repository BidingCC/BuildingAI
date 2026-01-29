import { Card, CardContent, CardHeader, CardTitle } from "@buildingai/ui/components/ui/card";
import { Panel } from "@xyflow/react";
import { StickyNote } from "lucide-react";
import { type DragEvent, useCallback, useMemo } from "react";

import { BlockRegistry } from "../blocks";

function BlocksPanel() {
  const handleDragStart = useCallback((event: DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData("application/react-flow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const workflowBlocks = useMemo(() => {
    return Object.keys(BlockRegistry);
  }, [BlockRegistry]);

  return (
    <Panel position="center-left" className="h-4/5 w-72">
      <Card className="size-full">
        <CardHeader>
          <CardTitle>BLOCKS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Workflow Blocks */}
          <div>
            <div className="mb-2 text-xs font-semibold text-gray-500 uppercase">工作流节点</div>
            <div className="space-y-2">
              {workflowBlocks.map((block) => {
                return (
                  <div
                    key={block}
                    draggable
                    className="cursor-grab transition-colors"
                    onDragStart={(event) => handleDragStart(event, block)}
                  >
                    <div className="rounded-lg bg-gray-200 p-4 capitalize hover:opacity-80">
                      {block}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Note Block */}
          <div>
            <div className="mb-2 text-xs font-semibold text-gray-500 uppercase">辅助工具</div>
            <div
              draggable
              className="cursor-grab transition-colors"
              onDragStart={(event) => handleDragStart(event, "note")}
            >
              <div className="flex items-center gap-2 rounded-lg bg-yellow-200 p-4 hover:opacity-80">
                <StickyNote className="h-4 w-4" />
                <span>笔记</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Panel>
  );
}

export { BlocksPanel };
