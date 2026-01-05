/**
 * Chat API - 模拟聊天接口
 * 提供会话管理和消息流式传输的模拟实现
 */

import { nanoid } from "nanoid";

import type { MessageData } from "../components/ask-assistant-ui/components/message";
import type { ThreadItem } from "../components/ask-assistant-ui/threadlist-sidebar";

// ================================
// Types
// ================================

/**
 * 会话创建响应
 */
export interface CreateThreadResponse {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 对话请求参数
 */
export interface ChatRequestParams {
  /** 会话 ID（可选，不传则自动创建新会话） */
  threadId?: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  modelId?: string;
}

/**
 * 流式响应的回调
 */
export interface StreamCallbacks {
  /** 会话创建回调（当 threadId 未提供时，在流式开始前返回新创建的会话 ID） */
  onThreadCreated?: (threadId: string) => void;
  onStart?: () => void;
  onToken?: (token: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: Error) => void;
}

// ================================
// Storage - 模拟数据存储
// ================================

const STORAGE_KEYS = {
  THREADS: "chat_threads",
  MESSAGES: "chat_messages",
} as const;

/**
 * 获取存储的会话列表
 */
function getStoredThreads(): ThreadItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.THREADS);
    if (stored) {
      const threads = JSON.parse(stored) as ThreadItem[];
      return threads.map((t) => ({
        ...t,
        createdAt: new Date(t.createdAt || Date.now()),
        updatedAt: new Date(t.updatedAt || Date.now()),
      }));
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * 保存会话列表
 */
function saveThreads(threads: ThreadItem[]): void {
  localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(threads));
}

/**
 * 获取指定会话的消息列表
 */
function getStoredMessages(threadId: string): MessageData[] {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEYS.MESSAGES}_${threadId}`);
    if (stored) {
      return JSON.parse(stored) as MessageData[];
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * 保存会话的消息列表
 */
function saveMessages(threadId: string, messages: MessageData[]): void {
  localStorage.setItem(`${STORAGE_KEYS.MESSAGES}_${threadId}`, JSON.stringify(messages));
}

/**
 * 删除会话的消息
 */
function deleteMessages(threadId: string): void {
  localStorage.removeItem(`${STORAGE_KEYS.MESSAGES}_${threadId}`);
}

/**
 * 创建会话（内部同步方法）
 */
function createThreadSync(title: string = "New Chat"): ThreadItem {
  const newThread: ThreadItem = {
    id: nanoid(),
    title,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const threads = getStoredThreads();
  threads.unshift(newThread);
  saveThreads(threads);

  return newThread;
}

// ================================
// Mock Responses
// ================================

const MOCK_RESPONSES = [
  `That's a great question! Let me help you understand this concept better.

## Key Points

1. **First**, consider the fundamental principles involved
2. **Second**, look at practical applications
3. **Third**, think about edge cases

Here's an example:

\`\`\`javascript
const example = {
  approach: 'systematic',
  benefits: ['clarity', 'maintainability', 'scalability']
};
\`\`\`

Would you like me to elaborate on any specific aspect?`,

  `I'd be happy to explain this in detail!

### Understanding the Concept

The key thing to remember is that proper implementation requires careful consideration of:

- **Architecture**: How components interact
- **State Management**: How data flows
- **Performance**: Optimization strategies

> "Good software design is about managing complexity." - Someone wise

Let me know if you need more specific guidance!`,

  `Great question! Here's a comprehensive overview:

## Overview

| Aspect | Description |
|--------|-------------|
| Purpose | Solve the core problem |
| Approach | Step-by-step methodology |
| Outcome | Expected results |

### Implementation Steps

1. Start with the basics
2. Build incrementally
3. Test continuously
4. Refine and optimize

Is there a particular area you'd like to explore further?`,

  `Absolutely! Let me break this down for you.

### The Fundamentals

Understanding the core concepts is essential:

- **Concept A**: Foundation of everything
- **Concept B**: Building blocks
- **Concept C**: Advanced techniques

### Practical Example

\`\`\`typescript
interface Solution {
  id: string;
  steps: string[];
  complexity: 'simple' | 'moderate' | 'complex';
}

const implement = (solution: Solution) => {
  return solution.steps.map(step => execute(step));
};
\`\`\`

Feel free to ask if you need more clarification!`,

  `This is an excellent topic to explore!

## Deep Dive

The approach I'd recommend involves several key considerations:

### 1. Planning Phase
- Define clear objectives
- Identify constraints
- Map out dependencies

### 2. Execution Phase
- Start with MVP
- Iterate based on feedback
- Document as you go

### 3. Review Phase
- Analyze results
- Gather insights
- Plan improvements

What aspect would you like to focus on?`,
];

// ================================
// API Functions
// ================================

/**
 * 模拟网络延迟
 */
function simulateNetworkDelay(ms: number = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 创建新会话
 * @returns 新创建的会话信息
 */
export async function createThread(): Promise<CreateThreadResponse> {
  await simulateNetworkDelay(200);

  const newThread = createThreadSync();

  return {
    id: newThread.id,
    title: newThread.title,
    createdAt: newThread.createdAt as Date,
    updatedAt: newThread.updatedAt as Date,
  };
}

/**
 * 获取会话列表
 * @returns 会话列表
 */
export async function getThreadList(): Promise<ThreadItem[]> {
  await simulateNetworkDelay(150);
  return getStoredThreads();
}

/**
 * 获取指定会话的消息列表
 * @param threadId 会话 ID
 * @returns 消息列表
 */
export async function getMessageList(threadId: string): Promise<MessageData[]> {
  await simulateNetworkDelay(200);
  return getStoredMessages(threadId);
}

/**
 * 删除会话
 * @param threadId 会话 ID
 */
export async function deleteThread(threadId: string): Promise<void> {
  await simulateNetworkDelay(150);

  const threads = getStoredThreads();
  const filtered = threads.filter((t) => t.id !== threadId);
  saveThreads(filtered);
  deleteMessages(threadId);
}

/**
 * 更新会话标题（同步版本，内部使用）
 */
function updateThreadTitleSync(threadId: string, title: string): void {
  const threads = getStoredThreads();
  const thread = threads.find((t) => t.id === threadId);
  if (thread) {
    thread.title = title;
    thread.updatedAt = new Date();
    saveThreads(threads);
  }
}

/**
 * 更新会话标题
 * @param threadId 会话 ID
 * @param title 新标题
 */
export async function updateThreadTitle(threadId: string, title: string): Promise<void> {
  await simulateNetworkDelay(100);
  updateThreadTitleSync(threadId, title);
}

/**
 * 发送消息并获取流式响应
 * 如果不传 threadId，会自动创建新会话并通过 onThreadCreated 回调返回
 *
 * @param params 对话请求参数
 * @param callbacks 流式响应回调
 * @returns AbortController 用于取消请求
 */
export function sendMessage(
  params: ChatRequestParams,
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();
  const { signal } = controller;

  // 异步处理流式响应
  (async () => {
    try {
      // 确定会话 ID（如果没有则创建新会话）
      let threadId = params.threadId;
      const isNewThread = !threadId;

      if (!threadId) {
        // 模拟网络延迟后创建会话
        await simulateNetworkDelay(100);

        if (signal.aborted) return;

        // 根据第一条消息内容生成标题
        const firstMessageContent = params.messages[0]?.content || "";
        const title =
          firstMessageContent.slice(0, 30) + (firstMessageContent.length > 30 ? "..." : "");

        const newThread = createThreadSync(title || "New Chat");
        threadId = newThread.id;

        // 通知调用方会话已创建
        callbacks.onThreadCreated?.(threadId);
      }

      // 保存用户消息
      const userMessage: MessageData = {
        key: nanoid(),
        from: "user",
        content: params.messages[params.messages.length - 1]?.content || "",
      };

      const existingMessages = getStoredMessages(threadId);
      existingMessages.push(userMessage);

      // 如果是已有会话的第一条消息，更新标题
      if (!isNewThread && existingMessages.filter((m) => m.from === "user").length === 1) {
        const firstUserContent = userMessage.content || "";
        const title = firstUserContent.slice(0, 30) + (firstUserContent.length > 30 ? "..." : "");
        updateThreadTitleSync(threadId, title);
      }

      // 模拟网络延迟
      await simulateNetworkDelay(300);

      if (signal.aborted) return;

      callbacks.onStart?.();

      // 随机选择一个响应
      const responseContent = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];

      // 创建助手消息
      const assistantMessage: MessageData = {
        key: nanoid(),
        from: "assistant",
        content: "",
      };
      existingMessages.push(assistantMessage);

      // 模拟流式输出
      const chunks = responseContent.split(/(?<=\s)|(?=\n)/);
      let fullContent = "";

      for (const chunk of chunks) {
        if (signal.aborted) {
          // 即使中断，也保存已有内容
          assistantMessage.content = fullContent;
          saveMessages(threadId, existingMessages);
          return;
        }

        fullContent += chunk;
        callbacks.onToken?.(chunk);

        // 模拟打字速度
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 30 + 10));
      }

      // 保存完整消息
      assistantMessage.content = fullContent;
      saveMessages(threadId, existingMessages);

      // 更新会话时间
      const threads = getStoredThreads();
      const thread = threads.find((t) => t.id === threadId);
      if (thread) {
        thread.updatedAt = new Date();
        saveThreads(threads);
      }

      callbacks.onComplete?.(fullContent);
    } catch (error) {
      if (!signal.aborted) {
        callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }
  })();

  return controller;
}

/**
 * 清空所有数据（用于测试）
 */
export function clearAllData(): void {
  const threads = getStoredThreads();
  for (const thread of threads) {
    deleteMessages(thread.id);
  }
  localStorage.removeItem(STORAGE_KEYS.THREADS);
}
