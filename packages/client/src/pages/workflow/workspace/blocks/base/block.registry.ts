import type { WorkflowBlocksType } from "@/pages/workflow/workspace/constants/node.ts";

import type { BlockBase, BlockMetadata } from "./block.base.ts";

/**
 * Block 注册表
 * 使用单例模式管理所有 Block
 */
export class BlockRegistry {
  private static instance: BlockRegistry;
  private blocks = new Map<string, BlockBase>();

  private constructor() {}

  /**
   * 获取注册表实例
   */
  static getInstance(): BlockRegistry {
    if (!BlockRegistry.instance) {
      BlockRegistry.instance = new BlockRegistry();
    }
    return BlockRegistry.instance;
  }

  /**
   * 注册 Block
   */
  register(block: BlockBase): void {
    const metadata = block.getMetadata();

    if (this.blocks.has(metadata.type)) {
      console.warn(`Block type "${metadata.type}" is already registered. Overwriting.`);
    }

    this.blocks.set(metadata.type, block);
  }

  /**
   * 批量注册 Blocks
   */
  registerAll(blocks: BlockBase[]): void {
    blocks.forEach((block) => this.register(block));
  }

  /**
   * 获取 Block
   */
  get(type: WorkflowBlocksType): BlockBase | undefined {
    return this.blocks.get(type);
  }

  /**
   * 检查 Block 是否存在
   */
  has(type: WorkflowBlocksType): boolean {
    return this.blocks.has(type);
  }

  /**
   * 获取所有已注册的 Block 元数据
   */
  getAllMetadata(): BlockMetadata[] {
    return Array.from(this.blocks.values())
      .map((block) => block.getMetadata())
      .filter((metadata) => metadata.enabled);
  }

  /**
   * 按分类获取 Blocks
   */
  getByCategory(category: string): BlockMetadata[] {
    return this.getAllMetadata().filter((metadata) => metadata.category === category);
  }

  /**
   * 清空注册表（主要用于测试）
   */
  clear(): void {
    this.blocks.clear();
  }
}

/**
 * 导出单例实例
 */
export const blockRegistry = BlockRegistry.getInstance();
