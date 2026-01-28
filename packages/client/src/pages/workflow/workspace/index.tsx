import "@xyflow/react/dist/style.css";

import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { type DragEvent, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";

import type { WorkflowBlocksType } from "@/pages/workflow/workspace/constants/node.ts";

import FlowNode from "./_components/flow-node";
import { WorkflowPanel } from "./_components/flow-panel";
import { BlocksPanel } from "./blocks-panel/blocks-panel";
import { WORKFLOW_BLOCK } from "./constants/workflow.ts";
import { selector, useWorkflowStore } from "./store/store.ts";

const nodeTypes = {
  [WORKFLOW_BLOCK]: FlowNode,
};

function FlowCanvas() {
  const reactFlowProps = useWorkflowStore(useShallow(selector));
  const { screenToFlowPosition } = useReactFlow();
  const createNode = useWorkflowStore((state) => state.createNode);

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleNodeDrop = useCallback((event: DragEvent) => {
    event.preventDefault();

    const type = event.dataTransfer.getData("application/react-flow") as WorkflowBlocksType;
    if (typeof type !== "string" || !type) {
      return;
    }

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    createNode({ ...position, type });
  }, []);

  return (
    <ReactFlow
      {...reactFlowProps}
      nodeTypes={nodeTypes}
      zoomOnDoubleClick={false}
      fitView
      fitViewOptions={{ maxZoom: 1.2 }}
      onDragOver={handleDragOver}
      onDrop={handleNodeDrop}
    >
      <Background
        gap={12}
        variant={BackgroundVariant.Dots}
        color="var(--sidebar-border)"
        bgColor="var(--sidebar)"
      ></Background>
    </ReactFlow>
  );
}

function Workspace() {
  return (
    <ReactFlowProvider>
      <FlowCanvas></FlowCanvas>
      <WorkflowPanel></WorkflowPanel>
      <BlocksPanel></BlocksPanel>
    </ReactFlowProvider>
  );
}

export default Workspace;
