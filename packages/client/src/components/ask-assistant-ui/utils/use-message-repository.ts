import type { UIMessage } from "ai";
import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";

import type { DisplayMessage, RawMessageRecord } from "./message-repository";
import { MessageRepository } from "./message-repository";

/**
 * useMessageRepository hook 的返回值
 */
export interface UseMessageRepositoryReturn {
  /** 当前活跃分支的消息列表 */
  messages: readonly UIMessage[];
  /** 当前活跃分支的展示消息列表（包含分支信息） */
  displayMessages: readonly DisplayMessage[];
  /** 当前头消息ID */
  headId: string | null;
  /** 消息总数 */
  size: number;
  /** 添加或更新消息 */
  addOrUpdateMessage: (
    parentId: string | null,
    message: UIMessage,
    sequence?: number,
    createdAt?: string,
  ) => void;
  /** 增量导入消息（不清空现有消息） */
  importIncremental: (records: RawMessageRecord[], setNewAsActive?: boolean) => boolean;
  /** 从原始记录导入消息（全量替换） */
  importMessages: (records: RawMessageRecord[], selectLatestBranch?: boolean) => void;
  /** 切换到指定分支 */
  switchToBranch: (messageId: string) => void;
  /** 获取分支信息 */
  getBranchInfo: (messageId: string) => {
    branchNumber: number;
    branchCount: number;
    branches: string[];
  } | null;
  /** 获取消息的父ID */
  getParentId: (messageId: string) => string | null | undefined;
  /** 删除消息 */
  deleteMessage: (messageId: string) => void;
  /** 清空所有消息 */
  clear: () => void;
  /** 检查消息是否存在 */
  has: (messageId: string) => boolean;
  /** 获取消息 */
  getMessage: (messageId: string) => UIMessage | undefined;
}

/**
 * 消息仓库 hook
 *
 * 提供消息树结构的管理功能，支持：
 * - 多个根消息
 * - 同一父消息下的多个分支（版本）
 * - 分支切换
 * - 增量更新（避免全量重建导致跳闪）
 */
export function useMessageRepository(): UseMessageRepositoryReturn {
  // 使用 ref 保存仓库实例，避免重新创建
  const repositoryRef = useRef<MessageRepository | null>(null);

  // 版本计数器，用于触发重新渲染
  const versionRef = useRef(0);

  // 订阅者列表
  const subscribersRef = useRef<Set<() => void>>(new Set());

  // 确保仓库实例存在
  if (!repositoryRef.current) {
    repositoryRef.current = new MessageRepository();
  }

  const repository = repositoryRef.current;

  // 触发更新的函数
  const notifySubscribers = useCallback(() => {
    versionRef.current++;
    subscribersRef.current.forEach((callback) => callback());
  }, []);

  // 使用 useSyncExternalStore 订阅仓库变化
  const subscribe = useCallback((callback: () => void) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  const getSnapshot = useCallback(() => versionRef.current, []);

  // 包装仓库方法，添加通知逻辑
  const addOrUpdateMessage = useCallback(
    (parentId: string | null, message: UIMessage, sequence: number = 0, createdAt?: string) => {
      repository.addOrUpdateMessage(parentId, message, sequence, createdAt);
      notifySubscribers();
    },
    [repository, notifySubscribers],
  );

  const importIncremental = useCallback(
    (records: RawMessageRecord[], setNewAsActive = true) => {
      const hasChange = repository.importIncremental(records, setNewAsActive);
      if (hasChange) {
        notifySubscribers();
      }
      return hasChange;
    },
    [repository, notifySubscribers],
  );

  const importMessages = useCallback(
    (records: RawMessageRecord[], selectLatestBranch = true) => {
      repository.import(records, selectLatestBranch);
      notifySubscribers();
    },
    [repository, notifySubscribers],
  );

  const switchToBranch = useCallback(
    (messageId: string) => {
      repository.switchToBranch(messageId);
      notifySubscribers();
    },
    [repository, notifySubscribers],
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      repository.deleteMessage(messageId);
      notifySubscribers();
    },
    [repository, notifySubscribers],
  );

  const clear = useCallback(() => {
    repository.clear();
    notifySubscribers();
  }, [repository, notifySubscribers]);

  const getBranchInfo = useCallback(
    (messageId: string) => {
      return repository.getBranchInfo(messageId);
    },
    [repository],
  );

  const getParentId = useCallback(
    (messageId: string) => {
      return repository.getParentId(messageId);
    },
    [repository],
  );

  const has = useCallback(
    (messageId: string) => {
      return repository.has(messageId);
    },
    [repository],
  );

  const getMessage = useCallback(
    (messageId: string) => {
      return repository.getMessage(messageId);
    },
    [repository],
  );

  // 使用 useSyncExternalStore 获取消息列表，确保只在仓库变化时更新
  const version = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // 使用 useMemo 缓存返回的消息列表，依赖 version 确保在仓库变化时更新
  const messages = useMemo(() => repository.getMessages(), [repository, version]);
  const displayMessages = useMemo(() => repository.getDisplayMessages(), [repository, version]);
  const headId = useMemo(() => repository.headId, [repository, version]);
  const size = useMemo(() => repository.size, [repository, version]);

  return {
    messages,
    displayMessages,
    headId,
    size,
    addOrUpdateMessage,
    importIncremental,
    importMessages,
    switchToBranch,
    getBranchInfo,
    getParentId,
    deleteMessage,
    clear,
    has,
    getMessage,
  };
}
