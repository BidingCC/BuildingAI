import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
} from "@buildingai/ui/components/ai-elements/tool";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { memo } from "react";

interface ToolPartData {
  toolCallId: string;
  state: string;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
  approval?: { id?: string; approved?: boolean };
}

export interface ImageGenerationToolProps {
  toolPart: ToolPartData;
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
}

interface ImageGenerationOutput {
  success: boolean;
  images?: Array<{ url: string; revisedPrompt?: string }>;
  model?: string;
  error?: string;
}

export const ImageGenerationTool = memo(function ImageGenerationTool({
  toolPart,
  addToolApprovalResponse,
}: ImageGenerationToolProps) {
  const { state, approval, input, output, errorText } = toolPart;
  const approvalId = approval?.id;
  const isDenied =
    state === "output-denied" || (state === "approval-responded" && approval?.approved === false);
  const widthClass = "w-[min(100%,600px)]";

  const outputData = output as ImageGenerationOutput | undefined;
  const hasError = errorText || outputData?.error || (outputData && !outputData.success);
  const isGenerating =
    (state === "approval-responded" || state === "input-available") &&
    approval?.approved === true &&
    !outputData?.success &&
    !hasError;

  if (isGenerating) {
    return (
      <div className={widthClass}>
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">图片创建中</p>
          <div className="relative aspect-square w-full overflow-hidden rounded-lg">
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (state === "output-available" && outputData?.success && outputData.images) {
    return (
      <div className={widthClass}>
        <div className="space-y-4">
          {outputData.images.map((image, index) => (
            <div key={index} className="overflow-hidden">
              <div className="relative aspect-square w-full">
                <img
                  src={image.url}
                  alt={image.revisedPrompt || `Generated image ${index + 1}`}
                  className="h-full w-full rounded-lg object-contain"
                />
              </div>
              {image.revisedPrompt && (
                <div className="pt-4">
                  {outputData.model && (
                    <p className="text-foreground mb-2 text-sm">生成成功: {outputData.model}</p>
                  )}
                  <p className="text-muted-foreground text-sm">
                    Revised prompt: {image.revisedPrompt}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isDenied) {
    return (
      <div className={widthClass}>
        <Tool className="w-full" defaultOpen>
          <ToolHeader state="output-denied" type="tool-imageGeneration" />
          <ToolContent>
            <div className="text-muted-foreground px-4 py-3 text-sm">
              Image generation was denied.
            </div>
          </ToolContent>
        </Tool>
      </div>
    );
  }

  if (hasError) {
    const errorMessage = errorText || outputData?.error || "Image generation failed";
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50">
        错误: {String(errorMessage)}
      </div>
    );
  }

  return (
    <div className={widthClass}>
      <Tool className="w-full" defaultOpen>
        <ToolHeader state={state as "input-available"} type="tool-imageGeneration" />
        <ToolContent>
          {(state === "input-available" || state === "approval-requested") && (
            <ToolInput input={input} />
          )}
          {state === "input-streaming" && (
            <div className="text-muted-foreground px-4 py-3 text-sm">
              Receiving image generation request...
            </div>
          )}
          {state === "approval-requested" && approvalId && addToolApprovalResponse && (
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-3 py-1.5 text-sm transition-colors"
                onClick={() =>
                  addToolApprovalResponse({
                    id: approvalId,
                    approved: false,
                    reason: "User denied image generation",
                  })
                }
                type="button"
              >
                Deny
              </button>
              <button
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm transition-colors"
                onClick={() => addToolApprovalResponse({ id: approvalId, approved: true })}
                type="button"
              >
                Allow
              </button>
            </div>
          )}
        </ToolContent>
      </Tool>
    </div>
  );
});
