import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";

import { VarListWithRef } from "../../components/VarList";
import type { BlockPanelProps } from "../base/block.base";
import type { OutputBlockData } from "./output.types";

export function OutputPanelComponent({ data, onChange }: BlockPanelProps<OutputBlockData>) {
  return (
    <div>
      <VarListWithRef
        title="输出变量"
        variables={data.inputs}
        onChange={(inputs) => onChange({ inputs })}
        newVarPrefix="output"
      />

      <div className="space-y-2">
        <div className="mb-2 text-sm font-medium">输出格式</div>
        <Select value={data.format} onValueChange={(format: any) => onChange({ format })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="text">纯文本</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
