import type { BasicNodeData } from "../../types.ts";

export interface InputNodeProps extends BasicNodeData {
  vars: {
    name: string;
    label: string;
    type: "string" | "number";
    required: boolean;
  }[];
}
