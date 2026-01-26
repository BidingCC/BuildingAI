export const WorkflowBlocks = {
  Input: "input",
  Output: "output",
} as const;

export type WorkflowBlocksType = (typeof WorkflowBlocks)[keyof typeof WorkflowBlocks];
