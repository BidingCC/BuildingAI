import type { UIMessage } from "ai";

import type { DisplayMessage } from "../types";

/**
 * 消息记录类型（从API或流式获取）
 */
export interface RawMessageRecord {
  id: string;
  parentId?: string | null;
  sequence: number;
  message: UIMessage;
  createdAt?: string;
}

/**
 * Represents a parent node in the repository tree structure.
 */
type RepositoryParent = {
  /** IDs of child messages */
  children: string[];
  /** Reference to the next message in the active branch */
  next: RepositoryMessage | null;
};

/**
 * Represents a message node in the repository tree structure.
 */
type RepositoryMessage = RepositoryParent & {
  /** Reference to the parent message */
  prev: RepositoryMessage | null;
  /** The actual message data */
  current: UIMessage;
  /** The depth level in the tree (0 for root messages) */
  level: number;
  /** sequence for ordering (from RawMessageRecord) */
  sequence: number;
  /** createdAt passthrough */
  createdAt?: string;
};

/**
 * Recursively finds the head (leaf) message in a branch.
 */
const findHead = (message: RepositoryMessage | RepositoryParent): RepositoryMessage | null => {
  if (message.next) return findHead(message.next);
  if ("current" in message) return message;
  return null;
};

/**
 * A utility class for caching computed values and invalidating the cache when needed.
 */
class CachedValue<T> {
  private _value: T | null = null;
  constructor(private func: () => T) {}
  get value(): T {
    if (this._value === null) this._value = this.func();
    return this._value;
  }
  dirty(): void {
    this._value = null;
  }
}

/**
 * MessageRepository（照搬版）
 *
 * - children: 存储同一 parent 下的所有版本（分支）
 * - next: 指向当前活跃分支
 * - head: 指向当前活跃分支的叶子节点
 * - 渲染：通过 head → prev 回溯得到当前活跃分支消息链
 */
export class MessageRepository {
  /** Map of message IDs to repository message objects */
  private messages = new Map<string, RepositoryMessage>();
  /** Reference to the current head (most recent) message in the active branch */
  private head: RepositoryMessage | null = null;
  /** Root node of the tree structure */
  private root: RepositoryParent = { children: [], next: null };

  /**
   * 逻辑消息索引：用于处理 AI SDK 流式过程中“同一条 assistant 消息 id 变更”
   *
   * 现象：一次 send 期间 assistant 消息可能先出现临时 id，结束后变成另一个 id。
   * 如果不归并，会被误判为“新增了一个分支版本”，导致版本 +1 且内容一样。
   */
  private logicalKeyIndex = new Map<string, string>();

  /**
   * 上一次 importIncremental 看到的消息ID集合
   * 用于区分：
   * - 同一次流式 run 内的 id 漂移（上一帧见过旧 id）=> 归并
   * - regenerate 新分支（截断后上一帧不会包含旧 assistant id）=> 不归并，正常新增版本
   */
  private lastImportSeenIds = new Set<string>();

  private buildLogicalKey(
    parentId: string | null,
    role: UIMessage["role"],
    sequence: number,
  ): string {
    return `${parentId ?? "ROOT"}::${role}::${sequence}`;
  }

  /**
   * 将 oldId 的节点迁移为 newId（修正 children 引用 / next / head）
   */
  private renameMessageId(oldId: string, newId: string): void {
    if (oldId === newId) return;
    const msg = this.messages.get(oldId);
    if (!msg) return;

    // 更新 message.id（保证渲染/查找一致）
    msg.current = { ...msg.current, id: newId } as UIMessage;

    // messages map
    this.messages.delete(oldId);
    this.messages.set(newId, msg);

    // 更新 parent.children 中的引用（只可能存在于一个 parent.children）
    const parentOrRoot: RepositoryParent = msg.prev ?? this.root;
    parentOrRoot.children = parentOrRoot.children.map((id) => (id === oldId ? newId : id));

    // 更新 active next 指针
    if (parentOrRoot.next === msg) {
      // no-op, next 指针是对象引用；但 children 中的 id 已经替换
    }

    // 更新 head（如果 head 就是这个对象，id 已更新）
    if (this.head === msg) {
      this.head = msg;
    }
  }

  /**
   * Recursively updates the level of a message and all its descendants.
   */
  private updateLevels(message: RepositoryMessage, newLevel: number): void {
    message.level = newLevel;
    for (const childId of message.children) {
      const childMessage = this.messages.get(childId);
      if (childMessage) this.updateLevels(childMessage, newLevel + 1);
    }
  }

  /**
   * Performs link/unlink operations between messages in the tree.
   */
  private performOp(
    newParent: RepositoryMessage | null,
    child: RepositoryMessage,
    operation: "cut" | "link" | "relink",
  ): void {
    const parentOrRoot = child.prev ?? this.root;
    const newParentOrRoot = newParent ?? this.root;

    if (operation === "relink" && parentOrRoot === newParentOrRoot) return;

    // cut
    if (operation !== "link") {
      parentOrRoot.children = parentOrRoot.children.filter((m) => m !== child.current.id);

      if (parentOrRoot.next === child) {
        const fallbackId = parentOrRoot.children.at(-1);
        const fallback = fallbackId ? this.messages.get(fallbackId) : null;
        if (fallback === undefined) {
          throw new Error("MessageRepository: 查找备用兄弟消息失败");
        }
        parentOrRoot.next = fallback;
      }
    }

    // link
    if (operation !== "cut") {
      // ensure the child is not part of parent tree
      for (let current: RepositoryMessage | null = newParent; current; current = current.prev) {
        if (current.current.id === child.current.id) {
          throw new Error("MessageRepository: 检测到重复消息ID（循环/重复引用）");
        }
      }

      newParentOrRoot.children = [...newParentOrRoot.children, child.current.id];

      // auto activate
      if (findHead(child) === this.head || newParentOrRoot.next === null) {
        newParentOrRoot.next = child;
      }

      child.prev = newParent;

      const newLevel = newParent ? newParent.level + 1 : 0;
      this.updateLevels(child, newLevel);
    }
  }

  /** Cached array of messages in the current active branch, from root to head */
  private _messages = new CachedValue<readonly UIMessage[]>(() => {
    const messages = new Array<UIMessage>((this.head?.level ?? -1) + 1);
    for (let current = this.head; current; current = current.prev) {
      messages[current.level] = current.current;
    }
    return messages;
  });

  /** Cached display messages (with branch info) */
  private _displayMessages = new CachedValue<readonly DisplayMessage[]>(() => {
    const branch = this._messages.value;
    const result: DisplayMessage[] = [];
    for (let i = 0; i < branch.length; i++) {
      const msg = branch[i]!;
      const repoMsg = this.messages.get(msg.id);
      const parent = repoMsg?.prev ?? null;
      const parentOrRoot: RepositoryParent = parent ?? this.root;
      const branches = parentOrRoot.children;
      result.push({
        id: msg.id,
        message: msg,
        parentId: parent?.current.id ?? null,
        sequence: repoMsg?.sequence ?? i,
        branchNumber: branches.indexOf(msg.id) + 1,
        branchCount: branches.length,
        branches: [...branches],
        isLast: false,
      });
    }
    if (result.length > 0) result[result.length - 1].isLast = true;
    return result;
  });

  /**
   * Gets the ID of the current head message.
   */
  get headId(): string | null {
    return this.head?.current.id ?? null;
  }

  /**
   * 获取当前活跃分支的消息列表
   */
  getMessages(): readonly UIMessage[] {
    return this._messages.value;
  }

  /**
   * 获取当前活跃分支的展示消息列表
   */
  getDisplayMessages(): readonly DisplayMessage[] {
    return this._displayMessages.value;
  }

  /**
   * 获取消息总数
   */
  get size(): number {
    return this.messages.size;
  }

  has(messageId: string): boolean {
    return this.messages.has(messageId);
  }

  getMessage(messageId: string): UIMessage | undefined {
    return this.messages.get(messageId)?.current;
  }

  getParentId(messageId: string): string | null | undefined {
    const msg = this.messages.get(messageId);
    if (!msg) return undefined;
    return msg.prev?.current.id ?? null;
  }

  /**
   * 添加或更新消息（支持 sequence/createdAt）
   */
  addOrUpdateMessage(
    parentId: string | null,
    message: UIMessage,
    sequence = 0,
    createdAt?: string,
  ): void {
    const existingItem = this.messages.get(message.id);

    // 如果 parentId 存在但找不到对应消息，降级为 root 级别，避免崩溃
    let prev: RepositoryMessage | null = null;
    if (parentId) {
      const foundPrev = this.messages.get(parentId);
      if (foundPrev) {
        prev = foundPrev;
      } else {
        console.warn(
          `MessageRepository(addOrUpdateMessage): Parent message not found: ${parentId}, treating as root`,
        );
      }
    }

    // update existing message
    if (existingItem) {
      existingItem.current = message;
      existingItem.sequence = sequence;
      existingItem.createdAt = createdAt;
      this.performOp(prev, existingItem, "relink");
      this._messages.dirty();
      this._displayMessages.dirty();
      return;
    }

    const newItem: RepositoryMessage = {
      prev,
      current: message,
      next: null,
      children: [],
      level: prev ? prev.level + 1 : 0,
      sequence,
      createdAt,
    };

    this.messages.set(message.id, newItem);
    this.performOp(prev, newItem, "link");

    if (this.head === prev) {
      this.head = newItem;
    }

    this._messages.dirty();
    this._displayMessages.dirty();
  }

  getBranchInfo(
    messageId: string,
  ): { branchNumber: number; branchCount: number; branches: string[] } | null {
    const message = this.messages.get(messageId);
    if (!message) return null;
    const { children } = message.prev ?? this.root;
    return {
      branchNumber: children.indexOf(messageId) + 1,
      branchCount: children.length,
      branches: [...children],
    };
  }

  /**
   * 切换到指定分支：更新 parent.next 指针 + head 指向该分支叶子
   */
  switchToBranch(messageId: string): void {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error("MessageRepository(switchToBranch): Branch not found.");
    }

    const prevOrRoot = message.prev ?? this.root;
    prevOrRoot.next = message;
    this.head = findHead(message);

    this._messages.dirty();
    this._displayMessages.dirty();
  }

  /**
   * 删除消息及其后代
   */
  deleteMessage(messageId: string): void {
    const message = this.messages.get(messageId);
    if (!message) return;

    const deleteDescendants = (msg: RepositoryMessage) => {
      for (const childId of msg.children) {
        const child = this.messages.get(childId);
        if (child) {
          deleteDescendants(child);
          this.messages.delete(childId);
        }
      }
    };
    deleteDescendants(message);

    this.performOp(null, message, "cut");
    this.messages.delete(messageId);

    if (this.head === message) {
      this.head = findHead(message.prev ?? this.root);
    }

    this._messages.dirty();
    this._displayMessages.dirty();
  }

  clear(): void {
    this.messages.clear();
    this.head = null;
    this.root = { children: [], next: null };
    this.logicalKeyIndex.clear();
    this.lastImportSeenIds.clear();
    this._messages.dirty();
    this._displayMessages.dirty();
  }

  /**
   * 增量导入：按 records 顺序 upsert
   */
  importIncremental(records: RawMessageRecord[], setNewAsActive = true): boolean {
    if (records.length === 0) return false;
    const sortedRecords = [...records].sort((a, b) => a.sequence - b.sequence);
    let changed = false;
    const prevHeadId = this.headId;
    const currentSeenIds = new Set(sortedRecords.map((r) => r.id));

    for (const record of sortedRecords) {
      const logicalKey = this.buildLogicalKey(
        record.parentId ?? null,
        record.message.role,
        record.sequence,
      );
      const aliasedId = this.logicalKeyIndex.get(logicalKey);

      // 仅当旧 id 在上一帧出现过，才认为是同一次 run 的 id 漂移替换
      if (
        !this.messages.has(record.id) &&
        aliasedId &&
        aliasedId !== record.id &&
        this.lastImportSeenIds.has(aliasedId)
      ) {
        this.renameMessageId(aliasedId, record.id);
        changed = true;
      }

      const exists = this.messages.has(record.id);
      this.addOrUpdateMessage(
        record.parentId ?? null,
        record.message,
        record.sequence,
        record.createdAt,
      );
      if (!exists) changed = true;

      // 记录逻辑 key -> 当前 id
      this.logicalKeyIndex.set(logicalKey, record.id);
    }

    // 如果新叶子是当前 head（或当前还没有 head），让其成为活跃分支
    if (setNewAsActive) {
      const lastId = sortedRecords.at(-1)?.id;
      if (lastId) {
        // 沿着 parent 链把 next 指针补齐（使 lastId 成为 head 的叶子）
        const leaf = this.messages.get(lastId);
        if (leaf) {
          for (let current: RepositoryMessage | null = leaf; current; current = current.prev) {
            const parent = current.prev ?? null;
            const parentOrRoot: RepositoryParent = parent ?? this.root;
            parentOrRoot.next = current;
          }
          this.head = findHead(leaf);
          changed = true;
        }
      }
    }

    if (this.headId !== prevHeadId) changed = true;

    this.lastImportSeenIds = currentSeenIds;
    return changed;
  }

  /**
   * 全量导入：清空后导入，并可选择最新分支
   */
  import(records: RawMessageRecord[], selectLatestBranch = true): void {
    this.clear();
    if (records.length === 0) return;
    const sortedRecords = [...records].sort((a, b) => a.sequence - b.sequence);

    for (const record of sortedRecords) {
      this.addOrUpdateMessage(
        record.parentId ?? null,
        record.message,
        record.sequence,
        record.createdAt,
      );
      this.logicalKeyIndex.set(
        this.buildLogicalKey(record.parentId ?? null, record.message.role, record.sequence),
        record.id,
      );
    }
    this.lastImportSeenIds = new Set(sortedRecords.map((r) => r.id));

    if (selectLatestBranch) {
      // 对每个 parent 的 children 选择最后一个作为 next（按导入顺序/sequence）
      for (const [, msg] of this.messages) {
        const parentOrRoot: RepositoryParent = msg.prev ?? this.root;
        if (parentOrRoot.children.length > 0) {
          const lastChildId = parentOrRoot.children.at(-1);
          if (lastChildId) {
            const child = this.messages.get(lastChildId);
            if (child) parentOrRoot.next = child;
          }
        }
      }
      this.head = findHead(this.root);
      this._messages.dirty();
      this._displayMessages.dirty();
    }
  }
}
