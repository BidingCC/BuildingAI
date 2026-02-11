import type { SlateLeafProps } from "platejs/static";
import { SlateLeaf } from "platejs/static";
import * as React from "react";

export function CodeLeafStatic(props: SlateLeafProps) {
  return (
    <SlateLeaf
      {...props}
      as="code"
      className="bg-muted rounded-md px-[0.3em] py-[0.2em] font-mono text-sm whitespace-pre-wrap"
    >
      {props.children}
    </SlateLeaf>
  );
}
