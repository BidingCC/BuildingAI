import type { BlockPanelComponent } from "../base/block.base.ts";
import type { InputBlockData, InputVar } from "./input.types.ts";

export const InputPanel: BlockPanelComponent<InputBlockData> = ({ data, onChange }) => {
  const handleVarChange = (index: number, updates: Partial<InputVar>) => {
    const newVars = [...data.vars];
    newVars[index] = { ...newVars[index], ...updates };
    onChange({ vars: newVars });
  };

  const handleRemoveVar = (index: number) => {
    onChange({
      vars: data.vars.filter((_, i) => i !== index),
    });
  };

  const handleAddVar = () => {
    const newVar: InputVar = {
      name: `var_${data.vars.length + 1}`,
      type: "string",
      label: "New Variable",
      required: false,
    };
    onChange({ vars: [...data.vars, newVar] });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="mb-4 text-sm font-medium">Input Variables</div>
        {data.vars.map((v, index) => (
          <div key={index} className="space-y-2 rounded border p-3">
            <input
              type="text"
              value={v.label}
              onChange={(e) => handleVarChange(index, { label: e.target.value })}
              className="w-full rounded border px-3 py-2"
              placeholder="Display label"
            />
            <input
              type="text"
              value={v.name}
              onChange={(e) => handleVarChange(index, { name: e.target.value })}
              className="w-full rounded border px-3 py-2"
              placeholder="Variable name"
            />
            <select
              value={v.type}
              onChange={(e) => handleVarChange(index, { type: e.target.value as InputVar["type"] })}
              className="w-full rounded border px-3 py-2"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="array">Array</option>
              <option value="object">Object</option>
            </select>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={v.required}
                onChange={(e) => handleVarChange(index, { required: e.target.checked })}
                className="rounded border"
              />
              <span className="text-sm">Required</span>
            </label>
            <button
              onClick={() => handleRemoveVar(index)}
              className="w-full rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleAddVar}
        className="bg-primary text-primary-foreground w-full rounded px-4 py-2 hover:opacity-90"
      >
        Add Variable
      </button>
    </div>
  );
};
