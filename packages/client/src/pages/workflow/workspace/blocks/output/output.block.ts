import { Square } from "lucide-react";
import { createElement } from "react";

import { BlockBase } from "../base/block.base";
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
        inputs: [],
        outputs: [],
        format: "json",
      }),
      handles: { target: true, source: false },
    });
  }

  get NodeComponent() {
    return OutputNodeComponent;
  }

  get PanelComponent() {
    return OutputPanelComponent;
  }

  validate(data: OutputBlockData) {
    const errors: string[] = [];

    if (!data.inputs?.length) {
      errors.push("至少需要配置一个输出变量");
    }

    data.inputs?.forEach((input, i) => {
      if (!input.ref?.nodeId || !input.ref?.varName) {
        errors.push(`输出 "${input.name || i + 1}" 缺少变量引用`);
      }
    });

    return { valid: !errors.length, errors: errors.length ? errors : undefined };
  }
}
