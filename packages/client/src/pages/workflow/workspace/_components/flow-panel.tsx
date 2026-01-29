import { Card, CardContent, CardHeader, CardTitle } from "@buildingai/ui/components/ui/card";
import { type OnSelectionChangeFunc, Panel, useOnSelectionChange } from "@xyflow/react";
import { useCallback, useMemo, useState } from "react";

import { BlockRegistry } from "../blocks";
import { NOTE_BLOCK } from "../constants/workflow.ts";
import type { AppNode } from "../types.ts";

function WorkflowPanel() {
  const [focusNode, setFocusNode] = useState<AppNode | null>(null);

  const handleSelectionChange: OnSelectionChangeFunc<AppNode> = useCallback(
    (params) => {
      if (params.nodes.length === 1) {
        const node = params.nodes[0];
        // 排除 NOTE_BLOCK 类型的节点，后面考虑使用 flag
        if (node.type === NOTE_BLOCK) {
          setFocusNode(null);
          return;
        }
        setFocusNode(node);
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

    const Panel = BlockRegistry[focusNode.data.type].Panel;
    return <Panel id={focusNode.id} data={focusNode.data}></Panel>;
  }, [focusNode?.data.type]);

  if (focusNode === null || !panelComponent) {
    return null;
  }

  return (
    <Panel position="center-right" className="h-4/5 w-72">
      <Card className="size-full">
        <CardHeader>
          <CardTitle>{focusNode.data.name}</CardTitle>
        </CardHeader>
        <CardContent>{panelComponent}</CardContent>
      </Card>
    </Panel>
  );
}

export { WorkflowPanel };
