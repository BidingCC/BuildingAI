import { Play } from "lucide-react";
import { createElement } from "react";

import { BlockBase } from "../base/block.base";
import { InputNodeComponent } from "./input.node";
import { InputPanelComponent } from "./input.panel";
import type { InputBlockData } from "./input.types";

export class InputBlock extends BlockBase<InputBlockData> {
  constructor() {
    super({
      type: "input",
      name: "开始",
      description: "工作流的入口节点，定义输入参数",
      category: "input",
      icon: createElement(Play),
      defaultData: () => ({
        outputs: [{ name: "input", type: "string", label: "输入内容", required: true }],
      }),
      handles: { target: false, source: true },
    });
  }

  get NodeComponent() {
    return InputNodeComponent;
  }

  get PanelComponent() {
    return InputPanelComponent;
  }

  validate(data: InputBlockData) {
    const errors: string[] = [];

    if (!data.outputs?.length) {
      errors.push("至少需要定义一个输入变量");
    }

    const names = data.outputs?.map((v) => v.name) || [];
    const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
    if (duplicates.length) {
      errors.push(`变量名重复: ${[...new Set(duplicates)].join(", ")}`);
    }

    return { valid: !errors.length, errors: errors.length ? errors : undefined };
  }
}
