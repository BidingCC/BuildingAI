import { Upload } from "lucide-react";

interface DocumentEmptyProps {
  canUpload?: boolean;
}

export function DocumentEmpty({ canUpload }: DocumentEmptyProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20">
      <div className="bg-muted rounded-full p-4">
        <Upload className="text-muted-foreground size-8" />
      </div>
      <p className="text-muted-foreground text-sm">
        {canUpload ? "点击上方「上传文件」添加文档" : "暂无文档"}
      </p>
    </div>
  );
}
