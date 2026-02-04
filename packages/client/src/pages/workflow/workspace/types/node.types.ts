import type { Edge, Node } from "@xyflow/react";

import type { WorkflowBlocksType } from "../constants/node.ts";

export interface BaseNodeData extends Record<string, unknown> {
  type: WorkflowBlocksType;
  name: string;
  _handles: {
    target: boolean;
    source: boolean;
  };
}

export type AppNode<T extends BaseNodeData = BaseNodeData> = Node<T>;
export type AppEdge = Edge;
