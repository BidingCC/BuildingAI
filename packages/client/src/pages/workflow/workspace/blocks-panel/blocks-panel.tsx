import { Card, CardContent, CardHeader, CardTitle } from "@buildingai/ui/components/ui/card";
import { Panel } from "@xyflow/react";
import { type DragEvent, useMemo } from "react";

import { BlockRegistry } from "@/pages/workflow/workspace/blocks";

function BlocksPanel() {
  const handleDragStart = (event: DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData("application/react-flow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const blocks = useMemo(() => {
    return Object.keys(BlockRegistry);
  }, [BlockRegistry]);

  return (
    <Panel position="center-left" className="h-4/5 w-72">
      <Card className="size-full">
        <CardHeader>
          <CardTitle>BLOCKS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {blocks.map((block) => {
            return (
              <div
                key={block}
                draggable
                className="cursor-grab"
                onDragStart={(event) => handleDragStart(event, block)}
              >
                <div className="rounded-lg bg-gray-200 p-4">{block}</div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </Panel>
  );
}

export { BlocksPanel };
