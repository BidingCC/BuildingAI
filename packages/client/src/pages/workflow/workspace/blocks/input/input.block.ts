import { Play } from "lucide-react";
import { createElement } from "react";

import {
  BlockBase,
  type InputVariablesConfig,
  type OutputVariablesConfig,
} from "../base/block.base";
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
        vars: [
          {
            name: "input",
            type: "string",
            label: "输入内容",
            required: true,
          },
        ],
      }),
      handles: {
        target: false, // 开始节点没有输入连接点
        source: true,
      },
    });
  }

  /**
   * InputBlock 的输出 = 用户定义的输入字段
   */
  getOutputConfig(): OutputVariablesConfig {
    return {
      type: "dynamic",
      dataField: "vars",
    };
  }

  /**
   * InputBlock 没有输入变量配置
   */
  getInputConfig(): InputVariablesConfig {
    return { type: "none" };
  }

  get NodeComponent() {
    return InputNodeComponent;
  }

  get PanelComponent() {
    return InputPanelComponent;
  }

  validate(data: InputBlockData) {
    const errors: string[] = [];

    if (!data.vars || data.vars.length === 0) {
      errors.push("至少需要定义一个输入变量");
    }

    // 检查变量名是否重复
    const names = data.vars.map((v) => v.name);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push(`变量名重复: ${duplicates.join(", ")}`);
    }

    // 检查变量名格式
    const invalidNames = data.vars.filter((v) => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v.name));
    if (invalidNames.length > 0) {
      errors.push(
        `无效的变量名: ${invalidNames.map((v) => v.name).join(", ")}（只能包含字母、数字和下划线，不能以数字开头）`,
      );
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
