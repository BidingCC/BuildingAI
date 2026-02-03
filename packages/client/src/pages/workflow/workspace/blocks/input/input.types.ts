import type { VariableDefinition } from "../../types/variable.types";

export interface InputVar extends VariableDefinition {
  defaultValue?: any;
}

export interface InputBlockData {
  vars: InputVar[];
}
