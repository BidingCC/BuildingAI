import { nanoid } from "nanoid";

import { WorkflowBlocks } from "../../constants/node.ts";
import { WORKFLOW_BLOCK } from "../../constants/workflow.ts";
import type { AppNode } from "../../types.ts";
import { HttpNode } from "./http.node";
import { HttpPanel } from "./http.panel";

function httpNodeBuilder(x: number, y: number): AppNode {
  return {
    id: nanoid(),
    position: { x, y },
    type: WORKFLOW_BLOCK,
    data: {
      name: "HTTP 请求",
      type: WorkflowBlocks.Http,
      method: "GET",
      url: "",
      headers: [],
      timeout: 5000,
      _handles: { target: true, source: true },
    },
  };
}

export default {
  Node: HttpNode,
  Panel: HttpPanel,
  builder: httpNodeBuilder,
};
