import { cn } from "@buildingai/ui/lib/utils";
import { Upload as UploadIcon } from "lucide-react";

const SUPPORTED_FORMATS = "支持 docx、xlsx、pptx、pdf、csv、md 等格式";

export interface DocumentDropZoneProps {
  isOver: boolean;
  visible: boolean;
}

export function DocumentDropZone({ isOver, visible }: DocumentDropZoneProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 backdrop-blur-xs transition-colors",
        isOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 bg-muted/30",
      )}
    >
      <div className="bg-primary/10 rounded-full p-4">
        <UploadIcon className="text-primary size-8" />
      </div>
      <p className="text-center text-sm font-semibold">
        {isOver ? "释放添加" : "拖拽文件到此处上传"}
      </p>
      <p className="text-muted-foreground text-xs">{SUPPORTED_FORMATS}</p>
    </div>
  );
}
