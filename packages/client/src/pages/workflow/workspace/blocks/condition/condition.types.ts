import type { BasicNodeData } from "../../types.ts";

export interface ConditionNodeData extends BasicNodeData {
  conditions: {
    field: string;
    operator: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "contains";
    value: string;
    logicOperator?: "and" | "or";
  }[];
}
