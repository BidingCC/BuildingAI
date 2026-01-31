import { nanoid } from "nanoid";
import type { FunctionComponent } from "react";

import { WORKFLOW_BLOCK } from "@/pages/workflow/workspace/constants/workflow.ts";

import type { WorkflowBlocksType } from "../../constants/node.ts";
import type { AppNode } from "../../types";

/**
 * Block 配置接口
 */
export interface BlockConfig<T = any> {
  /** Block 类型标识符 */
  type: WorkflowBlocksType;
  /** 显示名称 */
  label: string;
  /** 描述信息 */
  description?: string;
  /** 分类 */
  category: "input" | "output" | "logic" | "ai" | "integration" | "tool";
  /** 图标 */
  icon?: string;
  /** 是否可用 */
  enabled?: boolean;
  /** 默认数据 */
  defaultData: () => T;
  /** 句柄配置 */
  handles: {
    target: boolean;
    source: boolean;
  };
}

/**
 * Block 元数据
 */
export interface BlockMetadata {
  type: string;
  label: string;
  description?: string;
  category: string;
  icon?: string;
  enabled: boolean;
}

/**
 * Block Node 组件 Props
 */
export interface BlockNodeProps<T = any> {
  id: string;
  data: T;
  selected?: boolean;
}

export type BlockNodeComponent<T> = FunctionComponent<BlockNodeProps<T>>;

/**
 * Block Panel 组件 Props
 */
export interface BlockPanelProps<T = any> {
  id: string;
  data: T;
  onDataChange: (data: Partial<T>) => void;
}

export type BlockPanelComponent<T> = FunctionComponent<BlockPanelProps<T>>;

/**
 * Block 抽象基类
 * 提供统一的 Block 接口和默认实现
 */
export abstract class BlockBase<T = any> {
  protected config: BlockConfig<T>;

  protected constructor(config: BlockConfig<T>) {
    this.config = {
      enabled: true,
      ...config,
    };
  }

  /**
   * 获取 Block 元数据
   */
  getMetadata(): BlockMetadata {
    return {
      type: this.config.type,
      label: this.config.label,
      description: this.config.description,
      category: this.config.category,
      icon: this.config.icon,
      enabled: this.config.enabled ?? true,
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
      type: WORKFLOW_BLOCK,
      data: {
        type: this.config.type,
        name: this.config.label,
        _handles: this.config.handles,
        ...data,
      },
    };
  }

  /**
   * 验证节点数据
   */
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

  /**
   * 获取 Node 组件
   */
  abstract get NodeComponent(): FunctionComponent<BlockNodeProps<T>>;

  /**
   * 获取 Panel 组件
   */
  abstract get PanelComponent(): FunctionComponent<BlockPanelProps<T>>;
}
