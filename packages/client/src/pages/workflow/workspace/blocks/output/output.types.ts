import type { InputVariable } from "../../types/variable.types";

export interface OutputBlockData {
  inputs: InputVariable[];
  format: "json" | "text";
}
