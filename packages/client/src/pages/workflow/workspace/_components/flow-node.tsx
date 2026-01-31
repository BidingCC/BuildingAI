import {
  Node,
  NodeContent,
  NodeHeader,
  NodeTitle,
} from "@buildingai/ui/components/ai-elements/node";
import type { NodeProps } from "@xyflow/react";
import { useMemo } from "react";

import { blockRegistry } from "../blocks/base/block.registry";
import type { BasicNodeData } from "../types";

type FlowNodeProps = NodeProps & { data: BasicNodeData };

function FlowNode(props: FlowNodeProps) {
  const { data, selected } = props;

  // 从注册表获取对应的 Block
  const block = useMemo(() => blockRegistry.get(data.type), [data.type]);

  // 渲染 Node 组件
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

  // 对于 Note 等特殊节点（没有 handles），直接渲染组件，不包裹边框
  const metadata = block?.getMetadata();
  const handles = data._handles;
  const isSpecialNode = !handles?.target && !handles?.source;

  if (isSpecialNode && metadata?.type === "note") {
    return <NodeComponent id={props.id} data={data} selected={selected} />;
  }

  // 普通工作流节点，包裹标准边框
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

export default FlowNode;
