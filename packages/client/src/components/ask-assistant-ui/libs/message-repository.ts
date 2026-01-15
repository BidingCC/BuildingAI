import type { UIMessage } from "ai";

import type { DisplayMessage } from "../types";

/**
 * Message record type (from API or streaming)
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
 * MessageRepository
 *
 * - children: Stores all versions (branches) under the same parent
 * - next: Points to the current active branch
 * - head: Points to the leaf node of the current active branch
 * - Rendering: Traverse from head → prev to get the current active branch message chain
 */
export class MessageRepository {
  /** Map of message IDs to repository message objects */
  private messages = new Map<string, RepositoryMessage>();
  /** Reference to the current head (most recent) message in the active branch */
  private head: RepositoryMessage | null = null;
  /** Root node of the tree structure */
  private root: RepositoryParent = { children: [], next: null };

  /**
   * Logical message index: Used to handle "same assistant message id change" during AI SDK streaming
   *
   * Phenomenon: During a single send, an assistant message may first appear with a temporary id,
   * then change to another id after completion. If not merged, it would be misidentified as
   * "a new branch version", causing version +1 with the same content.
   */
  private logicalKeyIndex = new Map<string, string>();

  /**
   * Set of message IDs seen in the last importIncremental call
   * Used to distinguish:
   * - ID drift within the same streaming run (old id seen in previous frame) => merge
   * - Regenerate new branch (previous frame won't contain old assistant id after truncation) => don't merge, normally add new version
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
   * Migrates a node from oldId to newId (fixes children references / next / head)
   */
  private renameMessageId(oldId: string, newId: string): void {
    if (oldId === newId) return;
    const msg = this.messages.get(oldId);
    if (!msg) return;

    msg.current = { ...msg.current, id: newId } as UIMessage;

    this.messages.delete(oldId);
    this.messages.set(newId, msg);

    const parentOrRoot: RepositoryParent = msg.prev ?? this.root;
    parentOrRoot.children = parentOrRoot.children.map((id) => (id === oldId ? newId : id));

    if (parentOrRoot.next === msg) {
    }

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

    if (operation !== "link") {
      parentOrRoot.children = parentOrRoot.children.filter((m) => m !== child.current.id);

      if (parentOrRoot.next === child) {
        const fallbackId = parentOrRoot.children.at(-1);
        const fallback = fallbackId ? this.messages.get(fallbackId) : null;
        if (fallback === undefined) {
          throw new Error("MessageRepository: Failed to find fallback sibling message");
        }
        parentOrRoot.next = fallback;
      }
    }

    if (operation !== "cut") {
      for (let current: RepositoryMessage | null = newParent; current; current = current.prev) {
        if (current.current.id === child.current.id) {
          throw new Error("MessageRepository: Detected duplicate message ID (circular/duplicate reference)");
        }
      }

      newParentOrRoot.children = [...newParentOrRoot.children, child.current.id];

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
   * Gets the list of messages in the current active branch
   */
  getMessages(): readonly UIMessage[] {
    return this._messages.value;
  }

  /**
   * Gets the list of display messages in the current active branch
   */
  getDisplayMessages(): readonly DisplayMessage[] {
    return this._displayMessages.value;
  }

  /**
   * Gets the total number of messages
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
   * Adds or updates a message (supports sequence/createdAt)
   */
  addOrUpdateMessage(
    parentId: string | null,
    message: UIMessage,
    sequence = 0,
    createdAt?: string,
  ): void {
    const existingItem = this.messages.get(message.id);

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
   * Switches to the specified branch: updates parent.next pointer and head to point to the branch leaf
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
   * Deletes a message and its descendants
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
   * Incrementally imports: upserts in the order of records
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

      this.logicalKeyIndex.set(logicalKey, record.id);
    }

    if (setNewAsActive) {
        const lastId = sortedRecords.at(-1)?.id;
        if (lastId) {
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
   * Full import: clears then imports, optionally selects the latest branch
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
