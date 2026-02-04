export type VariableType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "any"
  | "file"
  | "array[file]";

/**
 * 变量定义（纯定义，不含值/引用）
 */
export interface VariableDefinition {
  name: string;
  label: string;
  type: VariableType;
  required?: boolean;
  description?: string;
  defaultValue?: any;
}

/**
 * 变量引用
 */
export interface VariableReference {
  nodeId: string;
  varName: string;
}

/**
 * 输入变量配置（带引用/值）
 */
export interface InputVariable extends VariableDefinition {
  /** 引用上游变量 */
  ref?: VariableReference;
  /** 直接值（当不使用引用时） */
  value?: any;
}

/**
 * 可用变量（用于 VariablePicker）
 */
export interface AvailableVariable {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  variable: VariableDefinition;
}

export interface GroupedVariables {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  variables: VariableDefinition[];
}

export const SYSTEM_VARIABLES: VariableDefinition[] = [
  { name: "sys.user_id", label: "用户 ID", type: "string" },
  { name: "sys.app_id", label: "应用 ID", type: "string" },
  { name: "sys.workflow_id", label: "工作流 ID", type: "string" },
  { name: "sys.workflow_run_id", label: "运行 ID", type: "string" },
  { name: "sys.timestamp", label: "时间戳", type: "number" },
];

export const VARIABLE_TYPE_COLORS: Record<VariableType, string> = {
  string: "text-emerald-600 bg-emerald-50 border-emerald-200",
  number: "text-blue-600 bg-blue-50 border-blue-200",
  boolean: "text-amber-600 bg-amber-50 border-amber-200",
  array: "text-purple-600 bg-purple-50 border-purple-200",
  object: "text-rose-600 bg-rose-50 border-rose-200",
  any: "text-gray-600 bg-gray-50 border-gray-200",
  file: "text-cyan-600 bg-cyan-50 border-cyan-200",
  "array[file]": "text-indigo-600 bg-indigo-50 border-indigo-200",
};

export const VARIABLE_TYPE_OPTIONS: { value: VariableType; label: string }[] = [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "array", label: "Array" },
  { value: "object", label: "Object" },
  { value: "any", label: "Any" },
  { value: "file", label: "File" },
  { value: "array[file]", label: "Array[File]" },
];

export function getTypeDefaultValue(type: VariableType): any {
  switch (type) {
    case "string":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "array":
    case "array[file]":
      return [];
    case "object":
      return {};
    default:
      return null;
  }
}

export function groupVariables(vars: AvailableVariable[]): GroupedVariables[] {
  const grouped = new Map<string, GroupedVariables>();

  for (const v of vars) {
    if (!grouped.has(v.nodeId)) {
      grouped.set(v.nodeId, {
        nodeId: v.nodeId,
        nodeName: v.nodeName,
        nodeType: v.nodeType,
        variables: [],
      });
    }
    grouped.get(v.nodeId)!.variables.push(v.variable);
  }

  return Array.from(grouped.values());
}

export function createVariable(
  name: string,
  type: VariableType = "string",
  label?: string,
): VariableDefinition {
  return { name, label: label || name, type };
}
