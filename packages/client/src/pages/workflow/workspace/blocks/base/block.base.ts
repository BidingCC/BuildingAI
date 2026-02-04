import { nanoid } from "nanoid";
import type { FunctionComponent, ReactElement } from "react";

import type { WorkflowBlocksType } from "../../constants/node.ts";
import type { AppNode } from "../../types/node.types";

export const WORKFLOW_NODE_TYPE = "workflow";

export type BlockCategory = "input" | "output" | "logic" | "ai" | "integration" | "tool";

export type BlockNodeComponent<T> = FunctionComponent<BlockNodeProps<T>>;
export type BlockPanelComponent<T> = FunctionComponent<BlockPanelProps<T>>;

export interface BlockConfig<T = any> {
  type: WorkflowBlocksType;
  name: string;
  description?: string;
  category: BlockCategory;
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
  category: BlockCategory;
  enabled: boolean;
  description?: string;
  icon?: ReactElement;
}

export interface BlockNodeProps<T = any> {
  id: string;
  data: T;
  selected?: boolean;
}

export interface BlockPanelProps<T = any> {
  data: T;
  onChange: (updates: Partial<T>) => void;
}

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

  get type(): WorkflowBlocksType {
    return this.config.type;
  }

  get name(): string {
    return this.config.name;
  }

  createNode(x: number, y: number, initialData?: Partial<T>): AppNode {
    const defaultData = this.config.defaultData();
    const data = initialData ? { ...defaultData, ...initialData } : defaultData;

    return {
      id: nanoid(),
      position: { x, y },
      type: WORKFLOW_NODE_TYPE,
      data: {
        type: this.config.type,
        name: this.config.name,
        _handles: this.config.handles,
        ...data,
      },
    };
  }

  validate(_data: T): { valid: boolean; errors?: string[] } {
    return { valid: true };
  }

  transform(data: T): T {
    return data;
  }

  abstract get NodeComponent(): FunctionComponent<BlockNodeProps<T>>;
  abstract get PanelComponent(): FunctionComponent<BlockPanelProps<T>>;
}
