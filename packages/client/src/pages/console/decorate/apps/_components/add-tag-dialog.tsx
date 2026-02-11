"use client";

import { useCreateConsoleTagMutation } from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

export type AddTagDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function AddTagDialog({ open, onOpenChange, onSuccess }: AddTagDialogProps) {
  const [tagName, setTagName] = useState("");
  const createMutation = useCreateConsoleTagMutation("app-center" as any, {
    onSuccess: () => {
      toast.success("标签创建成功");
      setTagName("");
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(`创建失败: ${error.message || "未知错误"}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = tagName.trim();
    if (!name) {
      toast.error("标签名称不能为空");
      return;
    }
    createMutation.mutate({ name });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-md flex-col">
        <DialogHeader>
          <DialogTitle>添加标签</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-5 py-2" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="tag-name">标签名称</Label>
            <Input
              id="tag-name"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="请输入标签名称"
              disabled={createMutation.isPending}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTagName("");
                onOpenChange(false);
              }}
              disabled={createMutation.isPending}
            >
              取消
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !tagName.trim()}>
              {createMutation.isPending ? "创建中…" : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
