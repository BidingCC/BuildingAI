export type VariableType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "any"
  | "file"
  | "array[file]";

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

export const VARIABLE_TYPE_ICONS: Record<VariableType, string> = {
  string: "s",
  number: "#",
  boolean: "b",
  array: "[]",
  object: "{}",
  any: "*",
  file: "f",
  "array[file]": "a",
};

export interface VariableDefinition {
  name: string;
  label: string;
  type: VariableType;
  required?: boolean;
  description?: string;
  defaultValue?: any;
}

export interface VariableReference {
  nodeId: string;
  varName: string;
}

export type InputVarValue =
  | {
      mode: "value";
      value: any;
    }
  | {
      mode: "reference";
      ref: VariableReference;
    };

export interface InputVarConfig {
  definition: VariableDefinition;
  value: InputVarValue;
}

export interface AvailableVariable {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  variable: VariableDefinition;
}

export interface GroupedAvailableVariables {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  variables: VariableDefinition[];
}

export const SYSTEM_VARIABLES: VariableDefinition[] = [
  { name: "sys.user_id", label: "用户 ID", type: "string", description: "当前用户的 ID" },
  { name: "sys.app_id", label: "应用 ID", type: "string", description: "当前应用的 ID" },
  { name: "sys.workflow_id", label: "工作流 ID", type: "string", description: "当前工作流的 ID" },
  {
    name: "sys.workflow_run_id",
    label: "运行 ID",
    type: "string",
    description: "本次运行的唯一 ID",
  },
  { name: "sys.timestamp", label: "时间戳", type: "number", description: "当前时间戳（毫秒）" },
];

export function createDefaultInputVarConfig(definition: VariableDefinition): InputVarConfig {
  return {
    definition,
    value: {
      mode: "value",
      value: definition.defaultValue ?? getTypeDefaultValue(definition.type),
    },
  };
}

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

export function formatVariableRef(
  ref: VariableReference,
  availableVars: AvailableVariable[],
): string {
  const found = availableVars.find(
    (v) => v.nodeId === ref.nodeId && v.variable.name === ref.varName,
  );
  if (found) {
    return `${found.nodeName} / ${found.variable.label}`;
  }
  return `${ref.nodeId} / ${ref.varName}`;
}

export function groupAvailableVariables(vars: AvailableVariable[]): GroupedAvailableVariables[] {
  const grouped = new Map<string, GroupedAvailableVariables>();

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
