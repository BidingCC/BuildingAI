import { WorkflowBlocks, type WorkflowBlocksType } from "../constants/node.ts";
import InputBlock from "./input";
import OutputBlock from "./output";
import type { WorkflowBlock } from "./types.ts";

export const BlockRegistry: Record<WorkflowBlocksType, WorkflowBlock> = {
  [WorkflowBlocks.Input]: InputBlock,
  [WorkflowBlocks.Output]: OutputBlock,
};
