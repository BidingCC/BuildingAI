import { Card, CardContent, CardHeader, CardTitle } from "@buildingai/ui/components/ui/card";
import { Panel } from "@xyflow/react";
import { type DragEvent, useCallback, useMemo } from "react";

import type { BlockMetadata } from "../blocks/base/block.base";
import { blockRegistry } from "../blocks/base/block.registry";

interface BlockItemProps {
  metadata: BlockMetadata;
  onDragStart: (event: DragEvent<HTMLDivElement>, type: string) => void;
}

function BlockItem({ metadata, onDragStart }: BlockItemProps) {
  return (
    <div
      draggable
      className="cursor-grab rounded-lg bg-gray-200 p-3 transition-all hover:bg-gray-300 hover:shadow-sm"
      onDragStart={(event) => onDragStart(event, metadata.type)}
    >
      <div className="flex items-center gap-2">
        {metadata.icon && <span className="text-lg">{metadata.icon}</span>}
        <div className="flex-1">
          <div className="font-medium">{metadata.label}</div>
          {metadata.description && (
            <div className="text-xs text-gray-600">{metadata.description}</div>
          )}
        </div>
      </div>
    </div>
  );
}

interface BlockCategoryProps {
  title: string;
  blocks: BlockMetadata[];
  onDragStart: (event: DragEvent<HTMLDivElement>, type: string) => void;
}

function BlockCategory({ title, blocks, onDragStart }: BlockCategoryProps) {
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-gray-500 uppercase">{title}</div>
      <div className="space-y-2">
        {blocks.map((block) => (
          <BlockItem key={block.type} metadata={block} onDragStart={onDragStart} />
        ))}
      </div>
    </div>
  );
}

function BlocksPanel() {
  const handleDragStart = useCallback((event: DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData("application/react-flow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  // 从注册表获取所有 Block 并按分类分组
  const blocksByCategory = useMemo(() => {
    const allBlocks = blockRegistry.getAllMetadata();

    const categories = {
      input: [] as BlockMetadata[],
      output: [] as BlockMetadata[],
      logic: [] as BlockMetadata[],
      ai: [] as BlockMetadata[],
      integration: [] as BlockMetadata[],
      tool: [] as BlockMetadata[],
    };

    allBlocks.forEach((block) => {
      if (block.category in categories) {
        categories[block.category as keyof typeof categories].push(block);
      }
    });

    return categories;
  }, []);

  const categoryLabels = {
    input: "输入",
    output: "输出",
    logic: "逻辑",
    ai: "AI",
    integration: "集成",
    tool: "工具",
  };

  return (
    <Panel position="center-left" className="h-4/5 w-72">
      <Card className="size-full overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle>Blocks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 overflow-y-auto p-4">
          {Object.entries(blocksByCategory).map(([category, blocks]) => (
            <BlockCategory
              key={category}
              title={categoryLabels[category as keyof typeof categoryLabels]}
              blocks={blocks}
              onDragStart={handleDragStart}
            />
          ))}
        </CardContent>
      </Card>
    </Panel>
  );
}

export { BlocksPanel };
