import type { VariableReference, VariableType } from "../../types/variable.types";

export type ComparisonOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_or_equal"
  | "less_or_equal"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty";

/**
 * 分支类型
 */
export type BranchType = "if" | "elif" | "else";

/**
 * 右值配置
 */
export interface RightValue {
  type: "variable" | "custom";
  // 变量引用
  ref?: VariableReference;
  // 自定义值
  value?: any;
  // 值类型（与左值类型一致）
  valueType?: VariableType;
}

/**
 * 条件配置
 */
export interface BranchCondition {
  leftRef: VariableReference;
  operator: ComparisonOperator;
  rightValue: RightValue;
}

/**
 * 条件分支
 */
export interface ConditionBranch {
  id: string;
  type: BranchType;
  handleId: string;
  // 条件配置（else 分支没有条件）
  condition?: BranchCondition;
}

export interface ConditionBlockData {
  branches: ConditionBranch[];
}

export const OPERATOR_LABELS: Record<ComparisonOperator, string> = {
  equals: "等于",
  not_equals: "不等于",
  greater_than: "大于",
  less_than: "小于",
  greater_or_equal: "大于等于",
  less_or_equal: "小于等于",
  contains: "包含",
  not_contains: "不包含",
  starts_with: "开始于",
  ends_with: "结束于",
  is_empty: "为空",
  is_not_empty: "不为空",
};

export const BRANCH_TYPE_LABELS: Record<BranchType, string> = {
  if: "IF",
  elif: "ELSE IF",
  else: "ELSE",
};

export const BRANCH_TYPE_COLORS: Record<BranchType, string> = {
  if: "bg-blue-50 text-blue-700 border-blue-200",
  elif: "bg-purple-50 text-purple-700 border-purple-200",
  else: "bg-gray-50 text-gray-700 border-gray-200",
};

export const BRANCH_TYPE_DOT_COLORS: Record<BranchType, string> = {
  if: "bg-blue-500",
  elif: "bg-purple-500",
  else: "bg-gray-500",
};
