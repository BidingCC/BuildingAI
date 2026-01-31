import { nanoid } from "nanoid";
import { BlockBase } from "../base/block.base";
import { ConditionNodeComponent } from "./condition.node";
import { ConditionPanelComponent } from "./condition.panel";
import type { ConditionBlockData } from "./condition.types";

/**
 * Condition Block 类
 * 用于实现条件判断和分支逻辑
 */
export class ConditionBlock extends BlockBase<ConditionBlockData> {
  constructor() {
    super({
      type: "condition",
      label: "条件判断",
      description: "根据条件判断结果执行不同的分支逻辑",
      category: "logic",
      icon: "🔀",
      defaultData: () => ({
        groups: [
          {
            id: nanoid(),
            operator: "and",
            rules: [
              {
                id: nanoid(),
                leftValue: "",
                leftType: "variable",
                operator: "equals",
                rightValue: "",
                rightType: "string",
              },
            ],
          },
        ],
        groupOperator: "and",
        defaultBranch: "both",
      }),
      handles: {
        target: true,
        source: true,
      },
    });
  }

  get NodeComponent() {
    return ConditionNodeComponent;
  }

  get PanelComponent() {
    return ConditionPanelComponent;
  }

  /**
   * 验证条件配置
   */
  validate(data: ConditionBlockData) {
    const errors: string[] = [];

    // 验证至少有一个条件组
    if (!data.groups || data.groups.length === 0) {
      errors.push("至少需要一个条件组");
      return { valid: false, errors };
    }

    // 验证每个条件组
    data.groups.forEach((group, groupIndex) => {
      if (!group.rules || group.rules.length === 0) {
        errors.push(`条件组 ${groupIndex + 1} 至少需要一条规则`);
      }

      // 验证每条规则
      group.rules.forEach((rule, ruleIndex) => {
        if (!rule.leftValue || rule.leftValue.trim() === "") {
          errors.push(
            `条件组 ${groupIndex + 1} 的规则 ${ruleIndex + 1} 缺少左值`
          );
        }

        // 需要右值的运算符
        const needsRightValue =
          rule.operator !== "is_empty" && rule.operator !== "is_not_empty";

        if (needsRightValue && (!rule.rightValue || rule.rightValue.trim() === "")) {
          errors.push(
            `条件组 ${groupIndex + 1} 的规则 ${ruleIndex + 1} 缺少右值`
          );
        }

        // 验证数字类型
        if (rule.leftType === "number" && isNaN(Number(rule.leftValue))) {
          errors.push(
            `条件组 ${groupIndex + 1} 的规则 ${ruleIndex + 1} 左值不是有效的数字`
          );
        }

        if (
          needsRightValue &&
          rule.rightType === "number" &&
          isNaN(Number(rule.rightValue))
        ) {
          errors.push(
            `条件组 ${groupIndex + 1} 的规则 ${ruleIndex + 1} 右值不是有效的数字`
          );
        }

        // 验证布尔类型
        if (rule.leftType === "boolean") {
          const validBooleans = ["true", "false", "1", "0"];
          if (!validBooleans.includes(rule.leftValue.toLowerCase())) {
            errors.push(
              `条件组 ${groupIndex + 1} 的规则 ${ruleIndex + 1} 左值不是有效的布尔值`
            );
          }
        }

        if (needsRightValue && rule.rightType === "boolean") {
          const validBooleans = ["true", "false", "1", "0"];
          if (!validBooleans.includes(rule.rightValue.toLowerCase())) {
            errors.push(
              `条件组 ${groupIndex + 1} 的规则 ${ruleIndex + 1} 右值不是有效的布尔值`
            );
          }
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 数据转换
   */
  transform(data: ConditionBlockData): ConditionBlockData {
    return {
      ...data,
      trueOutput: data.trueOutput || undefined,
      falseOutput: data.falseOutput || undefined,
    };
  }
}
