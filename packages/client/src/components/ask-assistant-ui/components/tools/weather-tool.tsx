import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
} from "@buildingai/ui/components/ai-elements/tool";
import { memo } from "react";

import { Weather } from "./weather";

interface ToolPartData {
  toolCallId: string;
  state: string;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
  approval?: { id?: string; approved?: boolean };
}

export interface WeatherToolProps {
  toolPart: ToolPartData;
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
}

export const WeatherTool = memo(function WeatherTool({
  toolPart,
  addToolApprovalResponse,
}: WeatherToolProps) {
  const { state, approval, input, output, errorText } = toolPart;
  const approvalId = approval?.id;
  const isDenied =
    state === "output-denied" || (state === "approval-responded" && approval?.approved === false);
  const widthClass = "w-[min(100%,450px)]";

  if (state === "output-available") {
    return (
      <div className={widthClass}>
        <Weather weatherAtLocation={output as Parameters<typeof Weather>[0]["weatherAtLocation"]} />
      </div>
    );
  }

  if (isDenied) {
    return (
      <div className={widthClass}>
        <Tool className="w-full" defaultOpen>
          <ToolHeader state="output-denied" type="tool-getWeather" />
          <ToolContent>
            <div className="text-muted-foreground px-4 py-3 text-sm">
              Weather lookup was denied.
            </div>
          </ToolContent>
        </Tool>
      </div>
    );
  }

  if (errorText || (output as { error?: string })?.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50">
        错误: {String(errorText || (output as { error?: string })?.error)}
      </div>
    );
  }

  return (
    <div className={widthClass}>
      <Tool className="w-full" defaultOpen>
        <ToolHeader state={state as "input-available"} type="tool-getWeather" />
        <ToolContent>
          {(state === "input-available" || state === "approval-requested") && (
            <ToolInput input={input} />
          )}
          {state === "approval-requested" && approvalId && addToolApprovalResponse && (
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-3 py-1.5 text-sm transition-colors"
                onClick={() =>
                  addToolApprovalResponse({
                    id: approvalId,
                    approved: false,
                    reason: "User denied weather lookup",
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
