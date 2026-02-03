import { nanoid } from "nanoid";
import type { FunctionComponent, ReactElement } from "react";

import type { WorkflowBlocksType } from "../../constants/node.ts";
import { WORKFLOW } from "../../constants/workflow.ts";
import type { AppNode } from "../../types";
import type { VariableDefinition } from "../../types/variable.types";

export interface BlockConfig<T = any> {
  type: WorkflowBlocksType;
  name: string;
  description?: string;
  category: "input" | "output" | "logic" | "ai" | "integration" | "tool";
  icon?: ReactElement;
  enabled?: boolean;
  defaultData: () => T;
  handles: {
    target: boolean;
    source: boolean;
  };
}

export interface BlockMetadata {
  type: string;
  name: string;
  category: string;
  enabled: boolean;
  description?: string;
  icon?: ReactElement;
}

export interface BlockNodeProps<T = any> {
  id: string;
  data: T;
  selected?: boolean;
}

export type BlockNodeComponent<T> = FunctionComponent<BlockNodeProps<T>>;

export interface BlockPanelProps<T = any> {
  data: T;
  onChange: (updates: Partial<T>) => void;
}

export type BlockPanelComponent<T> = FunctionComponent<BlockPanelProps<T>>;

export type OutputVariablesConfig =
  | { type: "fixed"; variables: VariableDefinition[] }
  | { type: "dynamic"; dataField: string }
  | { type: "none" };

export type InputVariablesConfig =
  | { type: "fixed"; variables: VariableDefinition[] }
  | { type: "dynamic"; dataField: string }
  | { type: "none" };

export abstract class BlockBase<T = any> {
  protected config: BlockConfig<T>;

  protected constructor(config: BlockConfig<T>) {
    this.config = {
      enabled: true,
      ...config,
    };
  }

  getMetadata(): BlockMetadata {
    return {
      type: this.config.type,
      name: this.config.name,
      description: this.config.description,
      category: this.config.category,
      enabled: this.config.enabled ?? true,
      icon: this.config.icon,
    };
  }

  createNode(x: number, y: number, initialData?: Partial<T>): AppNode {
    const defaultData = this.config.defaultData();
    const data = initialData ? { ...defaultData, ...initialData } : defaultData;
    return {
      id: nanoid(),
      position: { x, y },
      type: WORKFLOW,
      data: {
        type: this.config.type,
        name: this.config.name,
        _handles: this.config.handles,
        ...data,
      },
    };
  }

  validate(_data: T): { valid: boolean; errors?: string[] } {
    return { valid: true };
  }

  transform(data: T): T {
    return data;
  }
  getOutputConfig(): OutputVariablesConfig {
    return { type: "none" };
  }

  getInputConfig(): InputVariablesConfig {
    return { type: "none" };
  }

  getOutputVariables(data: T): VariableDefinition[] {
    const config = this.getOutputConfig();

    switch (config.type) {
      case "fixed":
        return config.variables;

      case "dynamic": {
        const dynamicOutputs = (data as any)[config.dataField];
        return Array.isArray(dynamicOutputs) ? dynamicOutputs : [];
      }

      case "none":
      default:
        return [];
    }
  }

  getInputVariables(data: T): VariableDefinition[] {
    const config = this.getInputConfig();

    switch (config.type) {
      case "fixed":
        return config.variables;

      case "dynamic": {
        const dynamicInputs = (data as any)[config.dataField];
        if (Array.isArray(dynamicInputs)) {
          return dynamicInputs.map((input: any) => (input.definition ? input.definition : input));
        }
        return [];
      }

      case "none":
      default:
        return [];
    }
  }

  isOutputEditable(): boolean {
    return this.getOutputConfig().type === "dynamic";
  }

  isInputEditable(): boolean {
    return this.getInputConfig().type === "dynamic";
  }

  abstract get NodeComponent(): FunctionComponent<BlockNodeProps<T>>;

  abstract get PanelComponent(): FunctionComponent<BlockPanelProps<T>>;
}
