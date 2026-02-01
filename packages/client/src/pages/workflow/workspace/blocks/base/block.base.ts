import { nanoid } from "nanoid";
import type { FunctionComponent, ReactElement } from "react";

import type { WorkflowBlocksType } from "../../constants/node.ts";
import { WORKFLOW } from "../../constants/workflow.ts";
import type { AppNode } from "../../types";

export interface BlockConfig<T = any> {
  type: WorkflowBlocksType;
  name: string;
  description?: string;
  category: "input" | "output" | "logic" | "ai" | "integration" | "tool";
  icon?: ReactElement;
  enabled?: boolean;
  defaultData: () => T;
  handles: {
    target: boolean;
    source: boolean;
  };
}

export interface BlockMetadata {
  type: string;
  name: string;
  category: string;
  enabled: boolean;
  description?: string;
  icon?: ReactElement;
}

export interface BlockNodeProps<T = any> {
  id: string;
  data: T;
  selected?: boolean;
}

export type BlockNodeComponent<T> = FunctionComponent<BlockNodeProps<T>>;

export interface BlockPanelProps<T = any> {
  data: T;
  onChange: (updates: Partial<T>) => void;
}

export type BlockPanelComponent<T> = FunctionComponent<BlockPanelProps<T>>;

export abstract class BlockBase<T = any> {
  protected config: BlockConfig<T>;

  protected constructor(config: BlockConfig<T>) {
    this.config = {
      enabled: true,
      ...config,
    };
  }

  getMetadata(): BlockMetadata {
    return {
      type: this.config.type,
      name: this.config.name,
      description: this.config.description,
      category: this.config.category,
      enabled: this.config.enabled ?? true,
      icon: this.config.icon,
    };
  }

  /**
   * 创建节点实例
   */
  createNode(x: number, y: number, initialData?: Partial<T>): AppNode {
    const defaultData = this.config.defaultData();
    const data = initialData ? { ...defaultData, ...initialData } : defaultData;
    return {
      id: nanoid(),
      position: { x, y },
      type: WORKFLOW,
      data: {
        type: this.config.type,
        name: this.config.name,
        _handles: this.config.handles,
        ...data,
      },
    };
  }

  validate(_data: T): { valid: boolean; errors?: string[] } {
    // 默认实现，子类可以重写
    return { valid: true };
  }

  /**
   * 节点数据转换（用于序列化/反序列化）
   */
  transform(data: T): T {
    // 默认实现，子类可以重写
    return data;
  }

  abstract get NodeComponent(): FunctionComponent<BlockNodeProps<T>>;

  abstract get PanelComponent(): FunctionComponent<BlockPanelProps<T>>;
}
