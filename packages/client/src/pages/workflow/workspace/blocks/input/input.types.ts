export interface InputVar {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  label: string;
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface InputBlockData {
  vars: InputVar[];
}
