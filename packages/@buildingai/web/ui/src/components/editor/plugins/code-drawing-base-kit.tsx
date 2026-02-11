import { BaseCodeDrawingPlugin } from "@platejs/code-drawing";

import { CodeDrawingElement } from "../ui/code-drawing-node";

export const BaseCodeDrawingKit = [
  BaseCodeDrawingPlugin.configure({
    node: { component: CodeDrawingElement },
  }),
];
