/**
 * 比较运算符
 */
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
 * 逻辑运算符
 */
export type LogicalOperator = "and" | "or";

/**
 * 值类型
 */
export type ValueType = "string" | "number" | "boolean" | "variable";

/**
 * 条件规则
 */
export interface ConditionRule {
  id: string;
  leftValue: string;
  leftType: ValueType;
  operator: ComparisonOperator;
  rightValue: string;
  rightType: ValueType;
}

/**
 * 条件组
 */
export interface ConditionGroup {
  id: string;
  operator: LogicalOperator;
  rules: ConditionRule[];
}

/**
 * Condition Block 数据结构
 */
export interface ConditionBlockData {
  // 条件组列表
  groups: ConditionGroup[];
  
  // 组之间的逻辑运算符
  groupOperator: LogicalOperator;
  
  // 输出配置
  trueOutput?: string;
  falseOutput?: string;
  
  // 默认分支（当条件为 false 时）
  defaultBranch?: "true" | "false" | "both";
}

/**
 * 运算符显示名称
 */
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

/**
 * 逻辑运算符显示名称
 */
export const LOGICAL_OPERATOR_LABELS: Record<LogicalOperator, string> = {
  and: "并且 (AND)",
  or: "或者 (OR)",
};
