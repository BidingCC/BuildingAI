import type { Edge, Node } from "@xyflow/react";

import type { WorkflowBlocksType } from "./constants/node.ts";

export interface BasicNodeData {
  name: string;
  type: WorkflowBlocksType;
  _handles: {
    target: boolean;
    source: boolean;
  };
}

export type AppNode = Node & { data: BasicNodeData };
export type AppEdge = Edge;

export interface NodeProps {
  data: BasicNodeData;
}
