import { Card, CardContent, CardHeader, CardTitle } from "@buildingai/ui/components/ui/card";
import { type OnSelectionChangeFunc, Panel, useOnSelectionChange } from "@xyflow/react";
import { useCallback } from "react";

import { blockRegistry } from "../blocks/base/block.registry";
import { WorkflowBlocks } from "../constants/node.ts";
import { useNodeEditor } from "../hooks/useNodeEditor";
import { useWorkflowSelection } from "../hooks/useWorkflowSelection";
import type { AppNode } from "../types";

function NodeEditorPanel({ nodeId }: { nodeId: string }) {
  const { data, node, immediateUpdate } = useNodeEditor(nodeId);

  if (!node) {
    return <div className="p-4 text-sm text-red-500">节点不存在</div>;
  }

  const block = blockRegistry.get(node.data.type);
  if (!block) {
    return (
      <div className="p-4 text-sm text-red-500">Block type "{node.data.type}" not registered</div>
    );
  }

  const PanelComponent = block.PanelComponent;

  return (
    <Card className="size-full overflow-hidden">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <span>{node.data.name}</span>
          <span className="text-muted-foreground text-xs">{node.data.type}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-y-auto p-4">
        <PanelComponent data={data} onChange={immediateUpdate} />
      </CardContent>
    </Card>
  );
}

function WorkflowPanel() {
  const { selectedNode, selectNode } = useWorkflowSelection();

  const handleSelectionChange: OnSelectionChangeFunc<AppNode> = useCallback(
    (params) => {
      if (params.nodes.length === 1) {
        const node = params.nodes[0];

        // Note 节点不显示编辑面板
        if (node.data.type === WorkflowBlocks.Note) {
          selectNode(null);
          return;
        }

        // 选中节点
        selectNode(node.id);
      } else {
        // 多选或取消选中
        selectNode(null);
      }
    },
    [selectNode],
  );

  useOnSelectionChange({ onChange: handleSelectionChange });

  if (!selectedNode) {
    return null;
  }

  return (
    <Panel position="center-right" className="h-4/5 w-80">
      <NodeEditorPanel nodeId={selectedNode.id} />
    </Panel>
  );
}

export { WorkflowPanel };
