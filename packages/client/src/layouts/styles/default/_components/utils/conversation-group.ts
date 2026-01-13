import type { ConversationRecord } from "@buildingai/services/web";

export type TimeGroup = "today" | "yesterday" | "3days" | "7days" | "30days" | "older";

export const TIME_GROUP_LABELS: Record<TimeGroup, string> = {
  today: "今天",
  yesterday: "昨天",
  "3days": "3天前",
  "7days": "7天前",
  "30days": "一个月前",
  older: "更早",
};

export function getTimeGroup(dateStr: string): TimeGroup {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays <= 3) return "3days";
  if (diffDays <= 7) return "7days";
  if (diffDays <= 30) return "30days";
  return "older";
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString("zh-CN");
}

export function groupConversationsByTime(
  conversations: ConversationRecord[],
): Map<TimeGroup, ConversationRecord[]> {
  const groups = new Map<TimeGroup, ConversationRecord[]>();
  const order: TimeGroup[] = ["today", "yesterday", "3days", "7days", "30days", "older"];

  for (const group of order) {
    groups.set(group, []);
  }

  for (const conversation of conversations) {
    const group = getTimeGroup(conversation.createdAt);
    groups.get(group)?.push(conversation);
  }

  return groups;
}
