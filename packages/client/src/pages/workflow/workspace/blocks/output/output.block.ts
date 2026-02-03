import { Square } from "lucide-react";
import { createElement } from "react";

import {
  BlockBase,
  type InputVariablesConfig,
  type OutputVariablesConfig,
} from "../base/block.base";
import { OutputNodeComponent } from "./output.node";
import { OutputPanelComponent } from "./output.panel";
import type { OutputBlockData } from "./output.types";

export class OutputBlock extends BlockBase<OutputBlockData> {
  constructor() {
    super({
      type: "output",
      name: "结束",
      description: "工作流的出口节点，定义输出结果",
      category: "output",
      icon: createElement(Square),
      defaultData: () => ({
        outputs: [],
        format: "json",
      }),
      handles: {
        target: true,
        source: false,
      },
    });
  }

  getOutputConfig(): OutputVariablesConfig {
    return { type: "none" };
  }

  getInputConfig(): InputVariablesConfig {
    return {
      type: "dynamic",
      dataField: "outputs",
    };
  }

  get NodeComponent() {
    return OutputNodeComponent;
  }

  get PanelComponent() {
    return OutputPanelComponent;
  }

  validate(data: OutputBlockData) {
    const errors: string[] = [];

    if (!data.outputs || data.outputs.length === 0) {
      errors.push("至少需要配置一个输出变量");
    }

    // 检查是否所有输出都有有效的引用
    data.outputs.forEach((output, index) => {
      if (!output.ref || !output.ref.nodeId || !output.ref.varName) {
        errors.push(`输出 "${output.name || index + 1}" 缺少变量引用`);
      }
    });

    // 检查输出名重复
    const names = data.outputs.map((o) => o.name);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push(`输出名称重复: ${duplicates.join(", ")}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
