import type { BasicNodeData } from "../../types.ts";

export interface NoteNodeData extends BasicNodeData {
  content: string;
  color: "yellow" | "blue" | "green" | "pink" | "purple";
}
