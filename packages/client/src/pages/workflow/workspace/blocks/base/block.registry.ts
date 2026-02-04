import type { WorkflowBlocksType } from "@/pages/workflow/workspace/constants/node.ts";

import type { BlockBase, BlockMetadata } from "./block.base";

class BlockRegistryClass {
  private blocks = new Map<WorkflowBlocksType, BlockBase>();

  register(block: BlockBase): void {
    this.blocks.set(block.type, block);
  }

  get(type: WorkflowBlocksType): BlockBase | undefined {
    return this.blocks.get(type);
  }

  getAll(): BlockBase[] {
    return Array.from(this.blocks.values());
  }

  getAllMetadata(): BlockMetadata[] {
    return this.getAll().map((b) => b.getMetadata());
  }

  getByCategory(category: string): BlockBase[] {
    return this.getAll().filter((b) => b.getMetadata().category === category);
  }

  has(type: WorkflowBlocksType): boolean {
    return this.blocks.has(type);
  }

  clear(): void {
    this.blocks.clear();
  }
}

export const blockRegistry = new BlockRegistryClass();
