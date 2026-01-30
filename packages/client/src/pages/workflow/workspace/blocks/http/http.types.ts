import type { BasicNodeData } from "../../types.ts";

export interface HttpNodeData extends BasicNodeData {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  headers: { key: string; value: string }[];
  body?: string;
  timeout?: number;
}
