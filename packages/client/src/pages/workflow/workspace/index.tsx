import "@xyflow/react/dist/style.css";

import { Background, BackgroundVariant, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";

import FlowNode from "./_components/flow-node";
import { WorkflowPanel } from "./_components/flow-panel";
import { WORKFLOW_BLOCK } from "./constants/workflow.ts";
import { selector, useWorkflowStore } from "./store.ts";

const nodeTypes = {
  [WORKFLOW_BLOCK]: FlowNode,
};

function Workspace() {
  const reactFlowProps = useWorkflowStore(useShallow(selector));

  return (
    <div className="size-full">
      <ReactFlowProvider>
        <ReactFlow
          {...reactFlowProps}
          deleteKeyCode={["del", "backspace"]}
          nodeTypes={nodeTypes}
          zoomOnDoubleClick={false}
          fitView
        >
          <Background
            gap={12}
            variant={BackgroundVariant.Dots}
            color="var(--sidebar-border)"
            bgColor="var(--sidebar)"
          ></Background>
        </ReactFlow>
        <WorkflowPanel></WorkflowPanel>
      </ReactFlowProvider>
    </div>
  );
}

export default Workspace;
