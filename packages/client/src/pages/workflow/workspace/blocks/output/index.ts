import { Ghost } from "lucide-react";
import { createElement } from "react";

import { BlockBase } from "../base/block.base";
import { OutputNode } from "./output.node";
import { OutputPanel } from "./output.panel";
import type { OutputBlockData } from "./output.types";

export class OutputBlock extends BlockBase<OutputBlockData> {
  constructor() {
    super({
      type: "output",
      name: "输出",
      description: "定义工作流的输出结果",
      category: "output",
      icon: createElement(Ghost),
      defaultData: () => ({
        vars: [
          {
            name: "result",
            type: "string",
            label: "结果",
          },
        ],
        format: "json",
      }),
      handles: {
        target: true,
        source: false,
      },
    });
  }

  get NodeComponent() {
    return OutputNode;
  }

  get PanelComponent() {
    return OutputPanel;
  }

  validate(data: OutputBlockData) {
    const errors: string[] = [];

    if (!data.vars || data.vars.length === 0) {
      errors.push("至少需要一个输出变量");
    }

    data.vars.forEach((v, index) => {
      if (!v.name || v.name.trim() === "") {
        errors.push(`变量 ${index + 1} 缺少名称`);
      }
      if (!v.label || v.label.trim() === "") {
        errors.push(`变量 ${index + 1} 缺少标签`);
      }
    });

    if (!data.format) {
      errors.push("必须指定输出格式");
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
