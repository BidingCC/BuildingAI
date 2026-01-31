import "@xyflow/react/dist/style.css";

import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { type DragEvent, useCallback, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

import FlowNode from "./_components/flow-node";
import { WorkflowPanel } from "./_components/flow-panel";
import { initializeBlocks } from "./blocks/init.ts";
import { BlocksPanel } from "./blocks-panel/blocks-panel";
import type { WorkflowBlocksType } from "./constants/node.ts";
import { WORKFLOW_BLOCK } from "./constants/workflow.ts";
import { createDefaultWorkflow } from "./demo.data.ts";
import { selector, useWorkflowStore } from "./store/store.ts";

initializeBlocks();

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

  const handleNodeDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/react-flow");
      if (!type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      createNode({
        x: position.x,
        y: position.y,
        type: type as WorkflowBlocksType,
      });
    },
    [createNode, screenToFlowPosition],
  );

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
  useEffect(() => {
    useWorkflowStore.setState({ ...createDefaultWorkflow() });
  }, []);

  return (
    <ReactFlowProvider>
      <FlowCanvas></FlowCanvas>
      <WorkflowPanel></WorkflowPanel>
      <BlocksPanel></BlocksPanel>
    </ReactFlowProvider>
  );
}

export default Workspace;
