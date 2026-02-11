"use client";

import { cn } from "@buildingai/ui/lib/utils";
import type { PlateElementProps } from "platejs/react";
import { PlateElement, useFocused, useReadOnly, useSelected } from "platejs/react";
import * as React from "react";

export function HrElement(props: PlateElementProps) {
  const readOnly = useReadOnly();
  const selected = useSelected();
  const focused = useFocused();

  return (
    <PlateElement {...props}>
      <div className="py-6" contentEditable={false}>
        <hr
          className={cn(
            "bg-muted h-0.5 rounded-sm border-none bg-clip-content",
            selected && focused && "ring-ring ring-2 ring-offset-2",
            !readOnly && "cursor-pointer",
          )}
        />
      </div>
      {props.children}
    </PlateElement>
  );
}
