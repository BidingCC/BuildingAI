import { WorkflowBlocks, type WorkflowBlocksType } from "../constants/node.ts";
import ConditionBlock from "./condition";
import HttpBlock from "./http";
import InputBlock from "./input";
import LlmBlock from "./llm";
import NoteBlock from "./note";
import OutputBlock from "./output";
import type { WorkflowBlock } from "./types.ts";

export const BlockRegistry: Record<WorkflowBlocksType, WorkflowBlock> = {
  [WorkflowBlocks.Input]: InputBlock,
  [WorkflowBlocks.Output]: OutputBlock,
  [WorkflowBlocks.LLM]: LlmBlock,
  [WorkflowBlocks.Condition]: ConditionBlock,
  [WorkflowBlocks.Http]: HttpBlock,
};

export const NoteBlockComponent = NoteBlock;
