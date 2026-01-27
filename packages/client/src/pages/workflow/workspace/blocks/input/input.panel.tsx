import { VarInput } from "../_components/var-input.tsx";
import type { PanelProps } from "../types.ts";
import type { InputNodeData } from "./input.types.ts";

export function InputPanel(props: PanelProps<InputNodeData>) {
  return (
    <div>
      {props.data.vars.map((v) => (
        <div key={v.name}>
          <VarInput {...v}></VarInput>
        </div>
      ))}
    </div>
  );
}
