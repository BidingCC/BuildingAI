import { GitBranch } from "lucide-react";
import { nanoid } from "nanoid";
import { createElement } from "react";

import { BlockBase } from "../base/block.base";
import { ConditionNodeComponent } from "./condition.node";
import { ConditionPanelComponent } from "./condition.panel";
import type { ConditionBlockData } from "./condition.types";

export class ConditionBlock extends BlockBase<ConditionBlockData> {
  constructor() {
    super({
      type: "condition",
      name: "条件分支",
      description: "根据条件执行不同的分支逻辑",
      category: "logic",
      icon: createElement(GitBranch),
      defaultData: () => ({
        // 默认一对 if/else
        branches: [
          {
            id: nanoid(),
            type: "if",
            label: "条件 1",
            condition: {
              leftRef: { nodeId: "", varName: "" },
              operator: "equals",
              rightValue: {
                type: "custom",
                value: "",
                valueType: "string",
              },
            },
          },
          {
            id: nanoid(),
            type: "else",
            label: "默认",
          },
        ],
        outputs: [
          { name: "branch", label: "执行的分支", type: "string" },
          { name: "result", label: "条件结果", type: "boolean" },
        ],
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

  validate(data: ConditionBlockData) {
    const errors: string[] = [];

    // 1. 至少需要一个 if 和一个 else
    const hasIf = data.branches.some((b) => b.type === "if");
    const hasElse = data.branches.some((b) => b.type === "else");

    if (!hasIf) {
      errors.push("至少需要一个 IF 分支");
    }

    if (!hasElse) {
      errors.push("至少需要一个 ELSE 分支");
    }

    // 2. else 必须是最后一个分支
    const elseIndex = data.branches.findIndex((b) => b.type === "else");
    if (elseIndex !== -1 && elseIndex !== data.branches.length - 1) {
      errors.push("ELSE 分支必须是最后一个分支");
    }

    // 3. 验证每个分支
    data.branches.forEach((branch, index) => {
      // if 和 else-if 必须有条件
      if (branch.type !== "else") {
        if (!branch.condition) {
          errors.push(`分支 "${index}" 缺少条件配置`);
          return;
        }

        const cond = branch.condition;

        // 左值必须配置
        if (!cond.leftRef.nodeId || !cond.leftRef.varName) {
          errors.push(`分支 "${index}" 的左值必须选择一个变量`);
        }

        // 需要右值的运算符
        const needsRightValue = cond.operator !== "is_empty" && cond.operator !== "is_not_empty";

        if (needsRightValue) {
          if (cond.rightValue.type === "variable") {
            // 变量引用
            if (!cond.rightValue.ref?.nodeId || !cond.rightValue.ref?.varName) {
              errors.push(`分支 "${index}" 的右值变量未选择`);
            }
          } else {
            // 自定义值
            if (cond.rightValue.value === undefined || cond.rightValue.value === "") {
              errors.push(`分支 "${index}" 的右值不能为空`);
            }
          }
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
