/**
 * Input 变量定义
 */
export interface InputVar {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  label: string;
  required: boolean;
  defaultValue?: any;
  description?: string;
}

/**
 * Input Block 数据结构
 */
export interface InputBlockData {
  vars: InputVar[];
}
