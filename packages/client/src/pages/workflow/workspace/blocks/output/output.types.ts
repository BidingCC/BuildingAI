export interface OutputVar {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  label: string;
  source?: string;
}

export interface OutputBlockData {
  vars: OutputVar[];
  format?: "json" | "text" | "html";
}
