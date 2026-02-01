import type { Edge, Node } from "@xyflow/react";

import type { WorkflowBlocksType } from "./constants/node.ts";

export interface BasicNodeData extends Record<string, any> {
  name: string;
  type: WorkflowBlocksType;
  _handles: {
    target: boolean;
    source: boolean;
  };
}

export type AppNode<T extends BasicNodeData = BasicNodeData> = Node<T>;
export type AppEdge = Edge;

export interface NodeProps<T extends BasicNodeData = BasicNodeData> {
  data: T;
}
