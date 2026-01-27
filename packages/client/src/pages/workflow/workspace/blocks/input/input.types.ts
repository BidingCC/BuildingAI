import type { BasicNodeData } from "../../types.ts";

export interface InputNodeData extends BasicNodeData {
  vars: {
    name: string;
    label: string;
    type: "string" | "number";
    required: boolean;
  }[];
}
