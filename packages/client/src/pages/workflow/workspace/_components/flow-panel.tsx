import { Card, CardContent, CardHeader, CardTitle } from "@buildingai/ui/components/ui/card";
import { type OnSelectionChangeFunc, Panel, useOnSelectionChange } from "@xyflow/react";
import { useCallback, useMemo, useState } from "react";

import { BlockRegistry } from "../blocks";
import type { AppNode, BasicNodeData } from "../types.ts";

function WorkflowPanel() {
  const [focusNode, setFocusNode] = useState<BasicNodeData | null>(null);

  const handleSelectionChange: OnSelectionChangeFunc<AppNode> = useCallback(
    (params) => {
      if (params.nodes.length === 1) {
        const node = params.nodes[0];
        setFocusNode(node.data);
      } else if (focusNode) {
        setFocusNode(null);
      }
    },
    [focusNode],
  );

  useOnSelectionChange({ onChange: handleSelectionChange });

  const panelComponent = useMemo(() => {
    if (focusNode === null) {
      return null;
    }

    const Panel = BlockRegistry[focusNode.type].Panel;
    return <Panel data={focusNode}></Panel>;
  }, [focusNode?.type]);

  if (focusNode === null) {
    return null;
  }

  return (
    <Panel position="center-right" className="h-4/5 w-72">
      <Card className="size-full">
        <CardHeader>
          <CardTitle>{focusNode.name}</CardTitle>
        </CardHeader>
        <CardContent>{panelComponent}</CardContent>
      </Card>
    </Panel>
  );
}

export { WorkflowPanel };
