import type { TCodeDrawingElement } from "@platejs/code-drawing";
import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import * as React from "react";

export function CodeDrawingElementStatic({
  children,
  ...props
}: SlateElementProps<TCodeDrawingElement>) {
  return (
    <SlateElement className="my-4 flex w-full items-stretch" {...props}>
      <div className="flex w-full flex-col md:flex-row">
        <div className="bg-muted/50 relative h-full min-w-0 flex-1 rounded-md p-8 pr-4">
          <pre className="m-0 overflow-x-auto font-mono text-sm leading-[normal] [tab-size:2] print:break-inside-avoid">
            <code className="block w-full">
              {(props.element.data?.code as string) || "Enter your code here..."}
            </code>
          </pre>
        </div>
        <div className="bg-muted/30 relative flex min-w-0 flex-1 items-center justify-center rounded-md border p-4">
          <div className="text-muted-foreground">
            {props.element.data?.drawingType || "Mermaid"}
          </div>
        </div>
      </div>
      {children}
    </SlateElement>
  );
}
