import type { NodeProps } from "../types.ts";
import type { InputNodeData } from "./input.types.ts";

export function InputNode(props: NodeProps<InputNodeData>) {
  return (
    <div>
      {props.data.vars.map((item) => {
        return (
          <div key={item.name}>
            <span className="mr-2">{item.label}:</span>
            <span className="rounded bg-gray-200 px-2 py-1">
              &#123;{item.type}&#125;&nbsp;-&nbsp;{item.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
