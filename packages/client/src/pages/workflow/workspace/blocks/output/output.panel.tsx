import type { BlockPanelComponent } from "../base/block.base";
import type { OutputBlockData, OutputVar } from "./output.types";

export const OutputPanel: BlockPanelComponent<OutputBlockData> = ({ data, onDataChange }) => {
  const handleAddVar = () => {
    const newVar: OutputVar = {
      name: `output_${data.vars.length + 1}`,
      type: "string",
      label: "新输出变量",
    };
    onDataChange({ vars: [...data.vars, newVar] });
  };

  const handleVarChange = (index: number, updates: Partial<OutputVar>) => {
    const newVars = [...data.vars];
    newVars[index] = { ...newVars[index], ...updates };
    onDataChange({ vars: newVars });
  };

  const handleRemoveVar = (index: number) => {
    onDataChange({
      vars: data.vars.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      {/* 输出格式选择 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">输出格式</label>
        <select
          value={data.format || "json"}
          onChange={(e) => onDataChange({ format: e.target.value as OutputBlockData["format"] })}
          className="w-full rounded border px-3 py-2"
        >
          <option value="json">JSON</option>
          <option value="text">Text</option>
          <option value="html">HTML</option>
        </select>
      </div>

      {/* 输出变量列表 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">输出变量</label>
        {data.vars.map((v, index) => (
          <div key={index} className="space-y-2 rounded border p-3">
            <input
              type="text"
              value={v.name}
              onChange={(e) => handleVarChange(index, { name: e.target.value })}
              className="w-full rounded border px-3 py-2"
              placeholder="变量名"
            />
            <input
              type="text"
              value={v.label}
              onChange={(e) => handleVarChange(index, { label: e.target.value })}
              className="w-full rounded border px-3 py-2"
              placeholder="显示标签"
            />
            <select
              value={v.type}
              onChange={(e) =>
                handleVarChange(index, { type: e.target.value as OutputVar["type"] })
              }
              className="w-full rounded border px-3 py-2"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="array">Array</option>
              <option value="object">Object</option>
            </select>
            <button
              onClick={() => handleRemoveVar(index)}
              className="w-full rounded bg-red-500 px-4 py-2 text-white"
            >
              删除
            </button>
          </div>
        ))}
      </div>

      {/* 添加变量按钮 */}
      <button
        onClick={handleAddVar}
        className="bg-primary text-primary-foreground w-full rounded px-4 py-2"
      >
        添加输出变量
      </button>
    </div>
  );
};
