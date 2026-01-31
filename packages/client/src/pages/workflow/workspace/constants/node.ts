export const WorkflowBlocks = {
  Input: "input",
  Output: "output",
  LLM: "llm",
  Condition: "condition",
  Http: "http",
  Note: "note",
} as const;

export type WorkflowBlocksType = (typeof WorkflowBlocks)[keyof typeof WorkflowBlocks];
