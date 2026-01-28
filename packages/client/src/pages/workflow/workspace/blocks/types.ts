import type { FunctionComponent } from "react";

export interface WorkflowBlock {
  Node: FunctionComponent<any>;
  Panel: FunctionComponent<any>;
  builder: (x: number, y: number) => any;
}

export interface NodeProps<T> {
  data: T;
}

export interface PanelProps<T> {
  data: T;
}
