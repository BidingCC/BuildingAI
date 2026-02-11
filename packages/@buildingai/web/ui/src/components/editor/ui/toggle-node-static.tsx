import { ChevronRight } from "lucide-react";
import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import * as React from "react";

export function ToggleElementStatic(props: SlateElementProps) {
  return (
    <SlateElement {...props} className="pl-6">
      <div
        className="text-muted-foreground hover:bg-accent absolute top-0 -left-0.5 size-6 cursor-pointer items-center justify-center rounded-md p-px transition-colors select-none [&_svg]:size-4"
        contentEditable={false}
      >
        <ChevronRight className="rotate-0 transition-transform duration-75" />
      </div>
      {props.children}
    </SlateElement>
  );
}
