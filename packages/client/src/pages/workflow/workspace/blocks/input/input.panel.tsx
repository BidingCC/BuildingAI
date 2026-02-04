import { VarListEditable } from "../../components/VarList";
import type { BlockPanelProps } from "../base/block.base";
import type { InputBlockData } from "./input.types";

export function InputPanelComponent({ data, onChange }: BlockPanelProps<InputBlockData>) {
  return (
    <div>
      <VarListEditable
        title="输入变量"
        variables={data.outputs}
        onChange={(outputs) => onChange({ outputs })}
        newVarPrefix="input"
      />
    </div>
  );
}
