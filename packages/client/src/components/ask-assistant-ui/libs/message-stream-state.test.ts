import { equal } from "node:assert/strict";
import { test } from "node:test";

import { Chat } from "@ai-sdk/react";
import type { ChatStatus, UIMessage, UIMessageChunk } from "ai";

import { getStreamingMessageId } from "./message-stream-state.ts";

const user = { id: "user-1", role: "user" as const };
const assistant = { id: "assistant-1", role: "assistant" as const };

for (const status of ["submitted", "streaming"] as const) {
  test(`${status}：空助手消息应处于生成中`, () => {
    equal(getStreamingMessageId([user, assistant], status), assistant.id);
  });

  test(`${status}：助手消息尚未创建时，不将用户消息或历史回复标记为生成中`, () => {
    equal(getStreamingMessageId([assistant, user], status), null);
  });

  test(`${status}：没有消息时不标记生成中的消息`, () => {
    equal(getStreamingMessageId([], status), null);
  });
}

for (const status of ["ready", "error"] as const) {
  test(`${status}：完成、停止或报错后恢复操作栏`, () => {
    equal(getStreamingMessageId([user, assistant], status), null);
  });
}

test("工具续写和重新生成的等待阶段保持助手消息处于生成中", () => {
  equal(getStreamingMessageId([user, assistant], "submitted"), assistant.id);
});

function waitForChat(chat: Chat<UIMessage>, predicate: () => boolean): Promise<void> {
  if (predicate()) return Promise.resolve();
  return new Promise((resolve) => {
    const onChange = () => {
      if (!predicate()) return;
      unsubscribeMessages();
      unsubscribeStatus();
      resolve();
    };
    const unsubscribeMessages = chat["~registerMessagesCallback"](onChange);
    const unsubscribeStatus = chat["~registerStatusCallback"](onChange);
  });
}

test("SDK 回归：start 占位、首字输出、完成时的生成状态连续正确", { timeout: 3000 }, async (t) => {
  let controller: ReadableStreamDefaultController<UIMessageChunk>;
  let closed = false;
  const stream = new ReadableStream<UIMessageChunk>({
    start(value) {
      controller = value;
    },
  });
  const chat = new Chat({
    transport: {
      sendMessages: async () => stream,
      reconnectToStream: async () => null,
    },
  });
  t.after(() => {
    if (!closed) controller.close();
  });
  const request = chat.sendMessage({ text: "描述图片" });
  const assistantCreated = waitForChat(chat, () => chat.messages.at(-1)?.role === "assistant");
  controller!.enqueue({ type: "start", messageId: assistant.id });
  await assistantCreated;

  equal(["submitted", "streaming"].includes(chat.status), true);
  equal(chat.messages.at(-1)?.parts.length, 0);
  equal(getStreamingMessageId(chat.messages, chat.status), assistant.id);

  const streamingStarted = waitForChat(chat, () => chat.status === "streaming");
  controller!.enqueue({ type: "text-start", id: "text-1" });
  await streamingStarted;
  equal(getStreamingMessageId(chat.messages, chat.status), assistant.id);

  controller!.enqueue({ type: "text-delta", id: "text-1", delta: "图片描述" });
  controller!.enqueue({ type: "text-end", id: "text-1" });
  controller!.enqueue({ type: "finish" });
  controller!.close();
  closed = true;
  await request;

  equal(chat.status as ChatStatus, "ready");
  equal(getStreamingMessageId(chat.messages, chat.status), null);
});
