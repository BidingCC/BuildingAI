import "@xyflow/react/dist/style.css";
import "./blocks/init.ts";

import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { type DragEvent, useCallback, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

import { WorkflowNode } from "./_components/workflow-node";
import { BlocksSidebar } from "./_layouts/blocks-sidebar";
import { WorkflowPanel } from "./_layouts/node-panel";
import { WorkflowToolbar } from "./_layouts/workflow-toolbar";
import type { WorkflowBlocksType } from "./constants/node.ts";
import { WORKFLOW } from "./constants/workflow.ts";
import { createDefaultWorkflow } from "./demo.data.ts";
import { selectReactFlowProps, useWorkflowStore } from "./store";

const nodeTypes = {
  [WORKFLOW]: WorkflowNode,
};

function FlowCanvas() {
  const reactFlowProps = useWorkflowStore(useShallow(selectReactFlowProps));
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
    [createNode],
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
    const defaultData = createDefaultWorkflow();
    useWorkflowStore.getState().clearNodes();
    useWorkflowStore.getState().clearEdges();

    useWorkflowStore.getState().addNodes(defaultData.nodes);
    useWorkflowStore.getState().setEdges(defaultData.edges);
  }, []);

  return (
    <ReactFlowProvider>
      <FlowCanvas />
      <WorkflowPanel />
      <BlocksSidebar />
      <WorkflowToolbar />
    </ReactFlowProvider>
  );
}

export default Workspace;
