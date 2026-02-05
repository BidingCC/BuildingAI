import { nanoid } from "nanoid";

import { blockRegistry } from "./blocks/base/block.registry";
import { WorkflowBlocks } from "./constants/node";
import type { AppEdge, AppNode } from "./types";

export function createDefaultWorkflow(): { nodes: AppNode[]; edges: AppEdge[] } {
  const inputBlock = blockRegistry.get(WorkflowBlocks.Input);
  const outputBlock = blockRegistry.get(WorkflowBlocks.Output);

  if (!inputBlock || !outputBlock) {
    console.warn("Required blocks not registered");
    return { nodes: [], edges: [] };
  }

  const nodes = [inputBlock.createNode(0, 0), outputBlock.createNode(500, 0)];

  const edges: AppEdge[] = [
    {
      id: nanoid(),
      source: nodes[0].id,
      target: nodes[1].id,
    },
  ];

  return { nodes, edges };
}
