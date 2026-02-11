"use client";

import { cn } from "@buildingai/ui/lib/utils";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import * as React from "react";

export function ParagraphElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} className={cn("m-0 px-0 py-1")}>
      {props.children}
    </PlateElement>
  );
}
