import type { WorkflowBlocksType } from "../../constants/node.ts";
import type { BlockBase, BlockMetadata } from "./block.base.ts";

export class BlockRegistry {
  private static instance: BlockRegistry;
  private blocks = new Map<string, BlockBase>();

  private constructor() {}

  static getInstance(): BlockRegistry {
    if (!BlockRegistry.instance) {
      BlockRegistry.instance = new BlockRegistry();
    }
    return BlockRegistry.instance;
  }

  register(block: BlockBase): void {
    const metadata = block.getMetadata();

    if (this.blocks.has(metadata.type)) {
      console.warn(`Block type "${metadata.type}" is already registered. Overwriting.`);
    }

    this.blocks.set(metadata.type, block);
  }

  registerAll(blocks: BlockBase[]): void {
    blocks.forEach((block) => this.register(block));
  }

  get(type: WorkflowBlocksType): BlockBase | undefined {
    return this.blocks.get(type);
  }

  has(type: WorkflowBlocksType): boolean {
    return this.blocks.has(type);
  }

  getAllMetadata(): BlockMetadata[] {
    return Array.from(this.blocks.values())
      .map((block) => block.getMetadata())
      .filter((metadata) => metadata.enabled);
  }

  getByCategory(category: string): BlockMetadata[] {
    return this.getAllMetadata().filter((metadata) => metadata.category === category);
  }

  clear(): void {
    this.blocks.clear();
  }
}

/** 单例 */
export const blockRegistry = BlockRegistry.getInstance();
