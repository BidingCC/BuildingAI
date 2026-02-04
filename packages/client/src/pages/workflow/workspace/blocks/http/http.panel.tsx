import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Separator } from "@buildingai/ui/components/ui/separator";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { useMemo } from "react";

import { VarListWithRef } from "../../components/VarList";
import { useWorkflowStore } from "../../store";
import { VariableUtils } from "../../utils/variable-utils";
import type { BlockPanelProps } from "../base/block.base";
import type { HttpBlockData } from "./http.types";

export function HttpPanelComponent({ data, onChange }: BlockPanelProps<HttpBlockData>) {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);

  const availableVars = useMemo(
    () => (selectedNodeId ? VariableUtils.getAvailableVariables(selectedNodeId, nodes, edges) : []),
    [selectedNodeId, nodes, edges],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 p-4">
          <div className="flex gap-2">
            <div className="w-28">
              <Select value={data.method} onValueChange={(method: any) => onChange({ method })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Input
                value={data.url}
                onChange={(e) => onChange({ url: e.target.value })}
                placeholder="https://api.example.com/endpoint"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="p-4">
          <VarListWithRef
            title="输入变量"
            variables={data.inputs}
            onChange={(inputs) => onChange({ inputs })}
            availableVars={availableVars}
            newVarPrefix="param"
          />
        </div>

        <Separator />

        {["POST", "PUT", "PATCH"].includes(data.method) && (
          <>
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <Label>请求体类型</Label>
                <Select
                  value={data.bodyType}
                  onValueChange={(bodyType: any) => onChange({ bodyType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="form">Form</SelectItem>
                    <SelectItem value="raw">Raw</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {data.bodyType !== "none" && (
                <div className="space-y-2">
                  <Label>请求体</Label>
                  <Textarea
                    value={data.body || ""}
                    onChange={(e) => onChange({ body: e.target.value })}
                    placeholder={data.bodyType === "json" ? '{"key": "value"}' : ""}
                    rows={5}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>超时 (ms)</Label>
              <Input
                type="number"
                value={data.timeout}
                onChange={(e) => onChange({ timeout: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>重试次数</Label>
              <Input
                type="number"
                value={data.retries}
                onChange={(e) => onChange({ retries: Number(e.target.value) })}
                min={0}
                max={5}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
