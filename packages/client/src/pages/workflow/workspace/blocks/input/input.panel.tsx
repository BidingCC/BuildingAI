import type { FunctionComponent } from "react";

import type { BlockPanelProps } from "../base/block.base.ts";
import type { InputBlockData, InputVar } from "./input.types.ts";

export const InputPanel: FunctionComponent<BlockPanelProps<InputBlockData>> = ({
  data,
  onDataChange,
}) => {
  return (
    <div className="space-y-4">
      {data.vars.map((v, index) => (
        <div key={v.name} className="space-y-2">
          <label className="text-sm font-medium">{v.label}</label>
          <input
            type="text"
            value={v.name}
            onChange={(e) => {
              const newVars = [...data.vars];
              newVars[index] = { ...newVars[index], name: e.target.value };
              onDataChange({ vars: newVars });
            }}
            className="w-full rounded border px-3 py-2"
            placeholder="Variable name"
          />
          <select
            value={v.type}
            onChange={(e) => {
              const newVars = [...data.vars];
              newVars[index] = {
                ...newVars[index],
                type: e.target.value as InputVar["type"],
              };
              onDataChange({ vars: newVars });
            }}
            className="w-full rounded border px-3 py-2"
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="array">Array</option>
            <option value="object">Object</option>
          </select>
        </div>
      ))}
      <button
        onClick={() => {
          const newVar: InputVar = {
            name: `var_${data.vars.length + 1}`,
            type: "string",
            label: "New Variable",
            required: false,
          };
          onDataChange({ vars: [...data.vars, newVar] });
        }}
        className="bg-primary text-primary-foreground w-full rounded px-4 py-2"
      >
        Add Variable
      </button>
    </div>
  );
};
