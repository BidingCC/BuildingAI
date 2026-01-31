/**
 * Note 节点颜色
 */
export type NoteColor = "yellow" | "blue" | "green" | "pink" | "purple";

/**
 * Note Block 数据结构
 */
export interface NoteBlockData {
  content: string;
  color: NoteColor;
}

/**
 * 颜色样式映射
 */
export const COLOR_STYLES: Record<NoteColor, string> = {
  yellow: "bg-yellow-100 border-yellow-300",
  blue: "bg-blue-100 border-blue-300",
  green: "bg-green-100 border-green-300",
  pink: "bg-pink-100 border-pink-300",
  purple: "bg-purple-100 border-purple-300",
};

/**
 * 颜色选项
 */
export const COLOR_OPTIONS: Array<{
  value: NoteColor;
  label: string;
  bg: string;
}> = [
  { value: "yellow", label: "黄色", bg: "bg-yellow-100" },
  { value: "blue", label: "蓝色", bg: "bg-blue-100" },
  { value: "green", label: "绿色", bg: "bg-green-100" },
  { value: "pink", label: "粉色", bg: "bg-pink-100" },
  { value: "purple", label: "紫色", bg: "bg-purple-100" },
];
