import type { StateCreator } from "zustand";

import type { AvailableVariable } from "../../types/variable.types";
import { VariableUtils } from "../../utils/variable-utils";

export interface VariablesSliceState {}

export interface VariablesSliceActions {
  getAvailableVariablesForNode: (
    nodeId: string,
    includeSystemVars?: boolean,
  ) => AvailableVariable[];

  validateVariableReference: (
    nodeId: string,
    refNodeId: string,
    varName: string,
  ) => { valid: boolean; error?: string };

  validateNodeReferences: (nodeId: string) => { valid: boolean; errors: string[] };

  detectCycles: () => boolean;

  getVariablePath: (nodeId: string, varName: string) => string;
}

export type VariablesSlice = VariablesSliceState & VariablesSliceActions;

export const createVariablesSlice: StateCreator<VariablesSlice> = (_, get) => ({
  getAvailableVariablesForNode: (nodeId: string, includeSystemVars = true) => {
    const { nodes, edges } = get() as any;
    return VariableUtils.getAvailableVariables(nodeId, nodes, edges, includeSystemVars);
  },

  validateVariableReference: (nodeId, refNodeId, varName) => {
    const { nodes, edges } = get() as any;
    return VariableUtils.validateReference(nodeId, refNodeId, varName, nodes, edges);
  },

  validateNodeReferences: (nodeId: string) => {
    const { nodes, edges } = get() as any;
    const node = nodes.find((n: any) => n.id === nodeId);
    if (!node) {
      return { valid: false, errors: ["节点不存在"] };
    }
    return VariableUtils.validateNodeReferences(node, nodes, edges);
  },

  detectCycles: () => {
    const { nodes, edges } = get() as any;
    return VariableUtils.hasCycle(nodes, edges);
  },

  getVariablePath: (nodeId: string, varName: string) => {
    const { nodes } = get() as any;
    return VariableUtils.getVariablePath(nodeId, varName, nodes);
  },
});
