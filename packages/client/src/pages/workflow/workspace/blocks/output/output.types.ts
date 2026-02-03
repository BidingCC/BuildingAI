import type { VariableReference, VariableType } from "../../types/variable.types";

export interface OutputVarConfig {
  name: string;
  label: string;
  type: VariableType;
  ref: VariableReference;
}

export interface OutputBlockData {
  outputs: OutputVarConfig[];
  format?: "json" | "text" | "html";
}
