import "@xyflow/react/dist/style.css";

import { Background, ReactFlow, type ReactFlowProps } from "@xyflow/react";
import type { ReactNode } from "react";

type CanvasProps = ReactFlowProps & {
  children?: ReactNode;
};

export const Canvas = ({ children, ...props }: CanvasProps) => (
  <ReactFlow fitView {...props}>
    <Background bgColor="var(--sidebar)" />
    {children}
  </ReactFlow>
);
