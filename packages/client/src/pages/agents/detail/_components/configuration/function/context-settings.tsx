import type { AnnotationConfig } from "@buildingai/types";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Label } from "@buildingai/ui/components/ui/label";
import { Slider } from "@buildingai/ui/components/ui/slider";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { Settings2 } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { toast } from "sonner";

import { ModelSelector } from "@/components/ask-assistant-ui";

const ANNOTATION_THRESHOLD_MIN = 0.85;
const ANNOTATION_THRESHOLD_MAX = 1;
const ANNOTATION_THRESHOLD_DEFAULT = 0.9;

type ContextUpdates = {
  showContext?: boolean;
  showReference?: boolean;
  annotationConfig?: AnnotationConfig | null;
  enableFileUpload?: boolean;
};

function clampThreshold(v: number): number {
  return Math.min(ANNOTATION_THRESHOLD_MAX, Math.max(ANNOTATION_THRESHOLD_MIN, v));
}

export const ContextSettings = memo(
  ({
    showContext,
    showReference,
    annotationConfig,
    enableFileUpload,
    onChange,
  }: {
    showContext: boolean;
    showReference: boolean;
    annotationConfig: AnnotationConfig | null;
    enableFileUpload: boolean;
    onChange: (updates: ContextUpdates) => void;
  }) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [threshold, setThreshold] = useState(() =>
      clampThreshold(annotationConfig?.threshold ?? ANNOTATION_THRESHOLD_DEFAULT),
    );
    const [vectorModelId, setVectorModelId] = useState(annotationConfig?.vectorModelId ?? "");

    const openDialog = useCallback(() => {
      setThreshold(clampThreshold(annotationConfig?.threshold ?? ANNOTATION_THRESHOLD_DEFAULT));
      setVectorModelId(annotationConfig?.vectorModelId ?? "");
      setDialogOpen(true);
    }, [annotationConfig?.threshold, annotationConfig?.vectorModelId]);

    const saveAnnotationSettings = useCallback(() => {
      const trimmedVectorModelId = vectorModelId?.trim() || undefined;
      const hadVectorModel = Boolean(annotationConfig?.vectorModelId?.trim());
      const hasVectorModel = Boolean(trimmedVectorModelId);
      const currentEnabled = annotationConfig?.enabled ?? false;

      const next: AnnotationConfig = {
        ...annotationConfig,
        enabled: currentEnabled || (!hadVectorModel && hasVectorModel),
        threshold: clampThreshold(threshold),
        vectorModelId: trimmedVectorModelId,
      };
      onChange({ annotationConfig: next });
      setDialogOpen(false);
    }, [annotationConfig, threshold, vectorModelId, onChange]);

    const annotationEnabled = annotationConfig?.enabled ?? false;
    const handleAnnotationEnabledChange = useCallback(
      (checked: boolean) => {
        if (checked && !annotationConfig?.vectorModelId) {
          toast.info("请先配置向量模型后再开启问答标注");
          openDialog();
          return;
        }
        onChange({
          annotationConfig: {
            ...annotationConfig,
            enabled: checked,
            threshold: annotationConfig?.threshold ?? ANNOTATION_THRESHOLD_DEFAULT,
            vectorModelId: annotationConfig?.vectorModelId,
          },
        });
      },
      [annotationConfig, onChange, openDialog],
    );

    return (
      <>
        <div className="bg-secondary flex items-center justify-between rounded-lg px-3 py-2.5">
          <div className="flex flex-col">
            <h3 className="text-sm font-medium">对话上下文</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              在智能体回复时，显示对话上下文，默认显示
            </p>
          </div>
          <div className="flex items-center justify-end">
            <Switch
              checked={showContext}
              onCheckedChange={(checked) => onChange({ showContext: checked })}
            />
          </div>
        </div>

        <div className="bg-secondary flex items-center justify-between rounded-lg px-3 py-2.5">
          <div className="flex flex-col">
            <h3 className="text-sm font-medium">引用来源</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              当回复引用了文档后，可查看引用的文档来源
            </p>
          </div>
          <div className="flex items-center justify-end">
            <Switch
              checked={showReference}
              onCheckedChange={(checked) => onChange({ showReference: checked })}
            />
          </div>
        </div>

        <div className="bg-secondary flex items-center justify-between rounded-lg px-3 py-2.5">
          <div className="flex flex-col">
            <h3 className="text-sm font-medium">问答标注</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">支持管理员标注用户的问题和回答</p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={openDialog}
                  className="hover:bg-primary/10 hover:text-primary"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-background text-xs">问答标注设置</div>
              </TooltipContent>
            </Tooltip>

            <Switch checked={annotationEnabled} onCheckedChange={handleAnnotationEnabledChange} />
          </div>
        </div>

        <div className="bg-secondary flex items-center justify-between rounded-lg px-3 py-2.5">
          <div className="flex flex-col">
            <h3 className="text-sm font-medium">文件上传</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">开启后用户可在对话中上传文件</p>
          </div>
          <div className="flex items-center justify-end">
            <Switch
              checked={enableFileUpload}
              onCheckedChange={(checked) => onChange({ enableFileUpload: checked })}
            />
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>问答标注设置</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>相似度阈值（{threshold.toFixed(2)}）</Label>
                <Slider
                  value={[threshold]}
                  onValueChange={([v]) =>
                    setThreshold(clampThreshold(v ?? ANNOTATION_THRESHOLD_DEFAULT))
                  }
                  min={ANNOTATION_THRESHOLD_MIN}
                  max={ANNOTATION_THRESHOLD_MAX}
                  step={0.01}
                />
                <p className="text-muted-foreground text-xs">
                  仅当相似度 ≥ 阈值时命中标注，范围 0.85～1
                </p>
              </div>
              <div className="grid gap-2">
                <Label>向量模型</Label>
                <ModelSelector
                  modelType="text-embedding"
                  value={vectorModelId || undefined}
                  onSelect={setVectorModelId}
                  placeholder="选择向量模型（用于语义匹配）"
                  triggerVariant="button"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button type="button" onClick={saveAnnotationSettings}>
                确定
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  },
);

ContextSettings.displayName = "ContextSettings";
