import {
  Node,
  NodeContent,
  NodeFooter,
  NodeHeader,
  NodeTitle,
} from "@buildingai/ui/components/ai-elements/node";
import { Button } from "@buildingai/ui/components/ui/button";
import { NodeToolbar, Position } from "@xyflow/react";
import { useMemo } from "react";

import { BlockRegistry } from "../blocks";
import type { BasicNodeData } from "../types.ts";

interface FlowNodeProps {
  data: BasicNodeData;
}

function FlowNode(props: FlowNodeProps) {
  const data = props.data;
  const NodeComponent = useMemo(() => BlockRegistry[data.type].Node, [data.type]);

  return (
    <>
      <NodeToolbar position={Position.Top} align="start">
        <Button>Run</Button>
        <Button>Delete</Button>
        <Button>More</Button>
      </NodeToolbar>
      <Node handles={data._handles}>
        <NodeHeader>
          <NodeTitle>{data.name}</NodeTitle>
        </NodeHeader>
        <NodeContent>
          <NodeComponent data={data}></NodeComponent>
        </NodeContent>
        <NodeFooter>
          <p>test</p>
        </NodeFooter>
      </Node>
    </>
  );
}

export default FlowNode;
