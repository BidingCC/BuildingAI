import "@xyflow/react/dist/style.css";

import { Canvas } from "@buildingai/ui/components/ai-elements/canvas";
import { Edge } from "@buildingai/ui/components/ai-elements/edge";
import {
  Node,
  NodeContent,
  NodeDescription,
  NodeFooter,
  NodeHeader,
  NodeTitle,
} from "@buildingai/ui/components/ai-elements/node";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge as EdgeType,
  type EdgeChange,
  MiniMap,
  type Node as NodeType,
  type NodeChange,
  ReactFlowProvider,
} from "@xyflow/react";
import { nanoid } from "nanoid";
import { useCallback, useState } from "react";

const nodeIds = {
  start: nanoid(),
  process1: nanoid(),
  process2: nanoid(),
  decision: nanoid(),
  output1: nanoid(),
  output2: nanoid(),
};

const nodesData = [
  {
    id: nodeIds.start,
    type: "workflow",
    position: { x: 0, y: 0 },
    data: {
      label: "Start",
      description: "Initialize workflow",
      handles: { target: false, source: true },
    },
  },
  {
    id: nodeIds.process1,
    type: "workflow",
    position: { x: 500, y: 0 },
    data: {
      label: "Process Data",
      description: "Transform input",
      handles: { target: true, source: true },
    },
  },
  {
    id: nodeIds.decision,
    type: "workflow",
    position: { x: 1000, y: 0 },
    data: {
      label: "Decision Point",
      description: "Route based on conditions",
      handles: { target: true, source: true },
    },
  },
  {
    id: nodeIds.output1,
    type: "workflow",
    position: { x: 1500, y: -100 },
    data: {
      label: "Success Path",
      description: "Handle success case",
      handles: { target: true, source: true },
    },
  },
  {
    id: nodeIds.output2,
    type: "workflow",
    position: { x: 1500, y: 100 },
    data: {
      label: "Error Path",
      description: "Handle error case",
      handles: { target: true, source: true },
    },
  },
  {
    id: nodeIds.process2,
    type: "workflow",
    position: { x: 2000, y: 0 },
    data: {
      label: "Complete",
      description: "Finalize workflow",
      handles: { target: true, source: false },
    },
  },
];

const edgesData = [
  {
    id: nanoid(),
    source: nodeIds.start,
    target: nodeIds.process1,
    type: "animated",
  },
  {
    id: nanoid(),
    source: nodeIds.process1,
    target: nodeIds.decision,
    type: "animated",
  },
  {
    id: nanoid(),
    source: nodeIds.decision,
    target: nodeIds.output1,
    type: "animated",
  },
  {
    id: nanoid(),
    source: nodeIds.decision,
    target: nodeIds.output2,
    type: "temporary",
  },
  {
    id: nanoid(),
    source: nodeIds.output1,
    target: nodeIds.process2,
    type: "animated",
  },
  {
    id: nanoid(),
    source: nodeIds.output2,
    target: nodeIds.process2,
    type: "temporary",
  },
];

const nodeTypes = {
  workflow: ({
    data,
  }: {
    data: {
      label: string;
      description: string;
      handles: { target: boolean; source: boolean };
    };
  }) => (
    <Node handles={data.handles}>
      <NodeHeader>
        <NodeTitle>{data.label}</NodeTitle>
        <NodeDescription>{data.description}</NodeDescription>
      </NodeHeader>
      <NodeContent>
        <p>test</p>
      </NodeContent>
      <NodeFooter>
        <p>test</p>
      </NodeFooter>
    </Node>
  ),
};

const edgeTypes = {
  animated: Edge.Animated,
  temporary: Edge.Temporary,
};

const WorkflowExample = () => {
  const [nodes, setNodes] = useState<NodeType[]>(nodesData);
  const [edges, setEdges] = useState<EdgeType[]>(edgesData);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params: Connection) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );

  return (
    <div className="h-screen w-screen">
      <ReactFlowProvider>
        <Canvas
          edges={edges}
          edgeTypes={edgeTypes}
          fitView
          nodes={nodes}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
        />
        <Controls />
        <MiniMap
          bgColor="var(--sidebar)"
          nodeColor="var(--secondary)"
          nodeStrokeColor="var(--secondary-foreground)"
          nodeBorderRadius={8}
          maskColor="rgba(0, 0, 0, 0.2)"
          maskStrokeColor="var(--secondary)"
          maskStrokeWidth={1}
        />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlowProvider>
    </div>
  );
};

export default WorkflowExample;
