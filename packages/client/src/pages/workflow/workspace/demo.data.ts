import { nanoid } from "nanoid";

import { blockRegistry } from "./blocks/init";
import { WorkflowBlocks } from "./constants/node.ts";
import type { AppEdge } from "./types.ts";

export function createDefaultWorkflow() {
  const nodes = [
    blockRegistry.get(WorkflowBlocks.Input)!.createNode(0, 0),
    blockRegistry.get(WorkflowBlocks.Output)!.createNode(500, 0),
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
