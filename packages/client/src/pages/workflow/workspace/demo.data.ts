import { nanoid } from "nanoid";

import { BlockRegistry } from "@/pages/workflow/workspace/blocks";

import { WorkflowBlocks } from "./constants/node.ts";
import { WORKFLOW_BLOCK } from "./constants/workflow.ts";
import type { AppEdge, AppNode } from "./types.ts";

export const initialNodes: AppNode[] = [
  {
    id: "node-1",
    position: { x: 0, y: 0 },
    type: WORKFLOW_BLOCK,
    data: {
      name: "abc",
      type: WorkflowBlocks.Input,
      description: "description",
      _handles: { target: false, source: true },
    },
  },
  {
    id: "node-2",
    position: { x: 500, y: 0 },
    type: WORKFLOW_BLOCK,
    data: {
      name: "def",
      type: WorkflowBlocks.Output,
      description: "description",
      _handles: { target: true, source: true },
    },
  },
  {
    id: "node-3",
    position: { x: 1000, y: 0 },
    type: WORKFLOW_BLOCK,
    data: {
      name: "def",
      type: WorkflowBlocks.Output,
      description: "description",
      _handles: { target: true, source: false },
    },
  },
];

export const initialEdges: AppEdge[] = [
  { id: "edge-1", source: "node-1", target: "node-2" },
  { id: "edge-2", source: "node-2", target: "node-3" },
];

export function createDefaultWorkflow() {
  const nodes = [
    {
      id: nanoid(),
      position: { x: 0, y: 0 },
      type: WORKFLOW_BLOCK,
      data: BlockRegistry[WorkflowBlocks.Input].builder(),
    },
    {
      id: nanoid(),
      position: { x: 500, y: 0 },
      type: WORKFLOW_BLOCK,
      data: BlockRegistry[WorkflowBlocks.Output].builder(),
    },
  ];

  const edges: AppEdge[] = [
    {
      id: nanoid(),
      source: nodes[0].id,
      target: nodes[1].id,
    },
  ];

  return {
    nodes,
    edges,
  };
}
