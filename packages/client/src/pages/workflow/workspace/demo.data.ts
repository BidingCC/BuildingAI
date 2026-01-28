import { nanoid } from "nanoid";

import { BlockRegistry } from "./blocks";
import { WorkflowBlocks } from "./constants/node.ts";
import type { AppEdge } from "./types.ts";

export function createDefaultWorkflow() {
  const nodes = [
    BlockRegistry[WorkflowBlocks.Input].builder(0, 0),
    BlockRegistry[WorkflowBlocks.Output].builder(500, 0),
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
