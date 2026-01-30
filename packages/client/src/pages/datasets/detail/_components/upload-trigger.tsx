import { Button } from "@buildingai/ui/components/ui/button";
import { Plus, UploadIcon } from "lucide-react";

export interface UploadTriggerProps {
  onClick?: () => void;
  variant?: "button" | "area";
}

export function UploadTrigger({ onClick, variant = "button" }: UploadTriggerProps) {
  if (variant === "area") {
    return (
      <div className="bg-sidebar rounded-lg px-8 py-6 text-center transition-colors">
        <div className="flex cursor-pointer flex-col items-center gap-3" onClick={onClick}>
          <div className="bg-primary rounded-full p-4">
            <UploadIcon className="text-background size-6" />
          </div>
          <div className="text-sm font-semibold">拖入文件或从本地上传</div>
          <div className="text-muted-foreground text-xs">
            支持docx、xlsx、pptx、pdf、csv、md等格式
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button variant="ghost" className="w-full gap-2" onClick={onClick}>
      <Plus className="size-4" />
      上传文件
    </Button>
  );
}
