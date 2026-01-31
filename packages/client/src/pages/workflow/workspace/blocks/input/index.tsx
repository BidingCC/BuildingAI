import { BlockBase } from "../base/block.base";
import { InputNode } from "./input.node.tsx";
import { InputPanel } from "./input.panel.tsx";
import type { InputBlockData } from "./input.types.ts";

export class InputBlock extends BlockBase<InputBlockData> {
  constructor() {
    super({
      type: "input",
      label: "输入",
      description: "定义工作流的输入变量",
      category: "input",
      icon: "⬇️",
      defaultData: () => ({
        vars: [
          {
            name: "input",
            type: "string",
            label: "输入",
            required: true,
          },
        ],
      }),
      handles: {
        target: false,
        source: true,
      },
    });
  }

  get NodeComponent() {
    return InputNode;
  }

  get PanelComponent() {
    return InputPanel;
  }

  /**
   * 验证输入数据
   */
  validate(data: InputBlockData) {
    const errors: string[] = [];

    if (!data.vars || data.vars.length === 0) {
      errors.push("至少需要一个输入变量");
    }

    data.vars.forEach((v, index) => {
      if (!v.name || v.name.trim() === "") {
        errors.push(`变量 ${index + 1} 缺少名称`);
      }
      if (!v.label || v.label.trim() === "") {
        errors.push(`变量 ${index + 1} 缺少标签`);
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
