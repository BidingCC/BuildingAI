import { nanoid } from "nanoid";

import { WorkflowBlocks } from "../../constants/node.ts";
import { WORKFLOW_BLOCK } from "../../constants/workflow.ts";
import type { AppNode } from "../../types.ts";
import { ConditionNode } from "./condition.node";
import { ConditionPanel } from "./condition.panel";

function conditionNodeBuilder(x: number, y: number): AppNode {
  return {
    id: nanoid(),
    position: { x, y },
    type: WORKFLOW_BLOCK,
    data: {
      name: "条件判断",
      type: WorkflowBlocks.Condition,
      conditions: [
        {
          field: "",
          operator: "eq",
          value: "",
        },
      ],
      _handles: { target: true, source: true },
    },
  };
}

export default {
  Node: ConditionNode,
  Panel: ConditionPanel,
  builder: conditionNodeBuilder,
};
