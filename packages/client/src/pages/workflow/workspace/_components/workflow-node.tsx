import {
  Node,
  NodeContent,
  NodeHeader,
  NodeTitle,
} from "@buildingai/ui/components/ai-elements/node";
import type { NodeProps } from "@xyflow/react";
import { useMemo } from "react";

import { blockRegistry } from "../blocks/base/block.registry";
import type { BaseNodeData } from "../types";

type FlowNodeProps = NodeProps & { data: BaseNodeData };

function WorkflowNode(props: FlowNodeProps) {
  const { data, selected } = props;

  const block = useMemo(() => blockRegistry.get(data.type), [data.type]);
  const NodeComponent = useMemo(() => {
    if (!block) {
      console.warn(`Block type "${data.type}" not found in registry`);
      return null;
    }
    return block.NodeComponent;
  }, [block]);

  if (!NodeComponent) {
    return (
      <Node handles={data._handles} className="border-red-500">
        <NodeHeader>
          <NodeTitle>Unknown Block</NodeTitle>
        </NodeHeader>
        <NodeContent>
          <div className="text-sm text-red-500">Block type "{data.type}" not registered</div>
        </NodeContent>
      </Node>
    );
  }

  // 对于没有 handles 的 node 直接渲染组件，待优化！
  const metadata = block?.getMetadata();
  const handles = data._handles;
  const isSpecialNode = !handles?.target && !handles?.source;

  if (isSpecialNode && metadata?.type === "note") {
    return <NodeComponent id={props.id} data={data} selected={selected} />;
  }

  return (
    <Node handles={data._handles} className={selected ? "ring-primary ring-2" : ""}>
      <NodeHeader>
        <NodeTitle>{data.name}</NodeTitle>
      </NodeHeader>
      <NodeContent>
        <NodeComponent id={props.id} data={data} selected={selected} />
      </NodeContent>
    </Node>
  );
}

export { WorkflowNode };
