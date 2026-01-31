import { Card, CardContent, CardHeader, CardTitle } from "@buildingai/ui/components/ui/card";
import { type OnSelectionChangeFunc, Panel, useOnSelectionChange } from "@xyflow/react";
import { useCallback, useMemo, useState } from "react";

import { WorkflowBlocks } from "@/pages/workflow/workspace/constants/node.ts";

import { blockRegistry } from "../blocks/base/block.registry";
import { useWorkflowStore } from "../store/store";
import type { AppNode } from "../types";

/**
 * 工作流 Panel 组件
 * 当选中节点时，显示对应的 Block Panel 进行编辑
 */
function WorkflowPanel() {
  const [focusNode, setFocusNode] = useState<AppNode | null>(null);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  /**
   * 处理节点选择变化
   */
  const handleSelectionChange: OnSelectionChangeFunc<AppNode> = useCallback(
    (params) => {
      if (params.nodes.length === 1) {
        const node = params.nodes[0];

        if (node.data.type === WorkflowBlocks.Note) {
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

  /**
   * 处理数据变化
   */
  const handleDataChange = useCallback(
    (nodeId: string, data: any) => {
      updateNodeData(nodeId, data);
    },
    [updateNodeData],
  );

  /**
   * 渲染 Panel 组件
   */
  const panelContent = useMemo(() => {
    if (!focusNode) {
      return null;
    }

    const block = blockRegistry.get(focusNode.data.type);

    if (!block) {
      return (
        <div className="text-sm text-red-500">
          Block type "{focusNode.data.type}" not registered
        </div>
      );
    }

    const PanelComponent = block.PanelComponent;

    return (
      <PanelComponent
        id={focusNode.id}
        data={focusNode.data}
        onDataChange={(data) => handleDataChange(focusNode.id, data)}
      />
    );
  }, [focusNode, handleDataChange]);

  // 未选中节点时不显示 Panel
  if (!focusNode || !panelContent) {
    return null;
  }

  return (
    <Panel position="center-right" className="h-4/5 w-80">
      <Card className="size-full overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <span>{focusNode.data.name}</span>
            <span className="text-muted-foreground text-xs">{focusNode.data.type}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-y-auto p-4">{panelContent}</CardContent>
      </Card>
    </Panel>
  );
}

export { WorkflowPanel };
