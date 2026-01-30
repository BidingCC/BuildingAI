import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useWorkflowStore } from "../../store/store";
import type { PanelProps } from "../types.ts";
import type { HttpNodeData } from "./http.types.ts";

export function HttpPanel(props: PanelProps<HttpNodeData>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  // 本地表单状态
  const [formData, setFormData] = useState({
    method: props.data.method,
    url: props.data.url,
    headers: props.data.headers,
    body: props.data.body,
    timeout: props.data.timeout,
  });
  const [isDirty, setIsDirty] = useState(false);

  // 当选中的节点变化时，重置表单数据
  useEffect(() => {
    setFormData({
      method: props.data.method,
      url: props.data.url,
      headers: props.data.headers,
      body: props.data.body,
      timeout: props.data.timeout,
    });
    setIsDirty(false);
  }, [props.id]);

  const handleMethodChange = useCallback((method: HttpNodeData["method"]) => {
    setFormData((prev) => ({ ...prev, method }));
    setIsDirty(true);
  }, []);

  const handleUrlChange = useCallback((url: string) => {
    setFormData((prev) => ({ ...prev, url }));
    setIsDirty(true);
  }, []);

  const handleBodyChange = useCallback((body: string) => {
    setFormData((prev) => ({ ...prev, body }));
    setIsDirty(true);
  }, []);

  const handleTimeoutChange = useCallback((timeout: number) => {
    setFormData((prev) => ({ ...prev, timeout }));
    setIsDirty(true);
  }, []);

  const handleAddHeader = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      headers: [...prev.headers, { key: "", value: "" }],
    }));
    setIsDirty(true);
  }, []);

  const handleRemoveHeader = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  }, []);

  const handleHeaderChange = useCallback(
    (index: number, field: "key" | "value", newValue: string) => {
      setFormData((prev) => {
        const newHeaders = [...prev.headers];
        newHeaders[index] = { ...newHeaders[index], [field]: newValue };
        return { ...prev, headers: newHeaders };
      });
      setIsDirty(true);
    },
    [],
  );

  // 保存到节点数据
  const handleSave = useCallback(() => {
    updateNodeData(props.id, formData);
    setIsDirty(false);
  }, [formData, props.id, updateNodeData]);

  // 取消编辑
  const handleCancel = useCallback(() => {
    setFormData({
      method: props.data.method,
      url: props.data.url,
      headers: props.data.headers,
      body: props.data.body,
      timeout: props.data.timeout,
    });
    setIsDirty(false);
  }, [props.data]);

  return (
    <div className="space-y-4">
      <div>
        <Label>请求方法</Label>
        <Select value={formData.method} onValueChange={handleMethodChange}>
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

      <div>
        <Label>请求地址</Label>
        <Input
          placeholder="https://api.example.com"
          value={formData.url}
          onChange={(e) => handleUrlChange(e.target.value)}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>请求头</Label>
          <Button size="sm" variant="outline" onClick={handleAddHeader}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[200px] space-y-2 overflow-y-auto">
          {formData.headers.map((header, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Key"
                value={header.key}
                onChange={(e) => handleHeaderChange(index, "key", e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Value"
                value={header.value}
                onChange={(e) => handleHeaderChange(index, "value", e.target.value)}
                className="flex-1"
              />
              <Button size="icon" variant="ghost" onClick={() => handleRemoveHeader(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {(formData.method === "POST" || formData.method === "PUT" || formData.method === "PATCH") && (
        <div>
          <Label>请求体</Label>
          <Textarea
            placeholder='{"key": "value"}'
            value={formData.body}
            onChange={(e) => handleBodyChange(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
        </div>
      )}

      <div>
        <Label>超时时间 (ms)</Label>
        <Input
          type="number"
          placeholder="5000"
          value={formData.timeout}
          onChange={(e) => handleTimeoutChange(Number(e.target.value))}
        />
      </div>

      {/* 保存/取消按钮 */}
      {isDirty && (
        <div className="flex gap-2 border-t pt-4">
          <Button onClick={handleSave} className="flex-1">
            保存
          </Button>
          <Button onClick={handleCancel} variant="outline" className="flex-1">
            取消
          </Button>
        </div>
      )}
    </div>
  );
}
