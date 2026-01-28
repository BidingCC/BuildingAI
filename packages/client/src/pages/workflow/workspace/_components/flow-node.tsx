import {
  Node,
  NodeContent,
  NodeHeader,
  NodeTitle,
} from "@buildingai/ui/components/ai-elements/node";
import type { NodeProps } from "@xyflow/react";
import { useMemo } from "react";

import { BlockRegistry } from "../blocks";
import type { BasicNodeData } from "../types.ts";

type FlowNodeProps = NodeProps & { data: BasicNodeData };

function FlowNode(props: FlowNodeProps) {
  const data = props.data;
  const NodeComponent = useMemo(() => BlockRegistry[data.type].Node, [data.type]);

  return (
    <Node handles={data._handles} className={props.selected ? "ring-primary" : ""}>
      <NodeHeader>
        <NodeTitle>{data.name}</NodeTitle>
      </NodeHeader>
      <NodeContent>
        <NodeComponent data={data}></NodeComponent>
      </NodeContent>
    </Node>
  );
}

export default FlowNode;
