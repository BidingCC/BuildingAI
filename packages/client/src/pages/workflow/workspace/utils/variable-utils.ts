import type { AppEdge, AppNode } from "../types/node.types";
import type { AvailableVariable, VariableDefinition } from "../types/variable.types";
import { SYSTEM_VARIABLES } from "../types/variable.types";

export class VariableUtils {
  /**
   * 获取节点可用的上游变量
   */
  static getAvailableVariables(
    targetNodeId: string,
    nodes: AppNode[],
    edges: AppEdge[],
    includeSystemVars = true,
  ): AvailableVariable[] {
    const result: AvailableVariable[] = [];

    // 获取上游节点
    const upstreamNodes = this.getUpstreamNodes(targetNodeId, nodes, edges);

    // 收集输出变量
    upstreamNodes.forEach((node) => {
      const outputs = this.getNodeOutputs(node);
      outputs.forEach((variable) => {
        result.push({
          nodeId: node.id,
          nodeName: node.data.name,
          nodeType: node.data.type,
          variable,
        });
      });
    });

    // 系统变量
    if (includeSystemVars) {
      SYSTEM_VARIABLES.forEach((variable) => {
        result.push({
          nodeId: "system",
          nodeName: "系统变量",
          nodeType: "system",
          variable,
        });
      });
    }

    return result;
  }

  static getNodeOutputs(node: AppNode): VariableDefinition[] {
    return Array.isArray(node.data.outputs) ? node.data.outputs : [];
  }

  /**
   * 获取上游节点
   */
  static getUpstreamNodes(nodeId: string, nodes: AppNode[], edges: AppEdge[]): AppNode[] {
    const visited = new Set<string>();
    const result: AppNode[] = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const traverse = (currentId: string) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      edges
        .filter((e) => e.target === currentId)
        .forEach((edge) => {
          const sourceNode = nodeMap.get(edge.source);
          if (sourceNode) {
            result.push(sourceNode);
            traverse(sourceNode.id);
          }
        });
    };

    traverse(nodeId);
    return this.topologicalSort(result, edges);
  }

  /**
   * 拓扑排序
   */
  private static topologicalSort(nodes: AppNode[], edges: AppEdge[]): AppNode[] {
    const sorted: AppNode[] = [];
    const visited = new Set<string>();
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      edges
        .filter((e) => e.target === nodeId)
        .forEach((edge) => {
          if (nodeMap.has(edge.source)) visit(edge.source);
        });

      const node = nodeMap.get(nodeId);
      if (node) sorted.push(node);
    };

    nodes.forEach((n) => visit(n.id));
    return sorted;
  }

  /**
   * 验证变量引用
   */
  static validateReference(
    nodeId: string,
    refNodeId: string,
    varName: string,
    nodes: AppNode[],
    edges: AppEdge[],
  ): { valid: boolean; error?: string } {
    // 系统变量
    if (refNodeId === "system") {
      const exists = SYSTEM_VARIABLES.some((v) => v.name === varName);
      return exists ? { valid: true } : { valid: false, error: `系统变量 ${varName} 不存在` };
    }

    // 检查节点存在
    const refNode = nodes.find((n) => n.id === refNodeId);
    if (!refNode) {
      return { valid: false, error: "引用的节点不存在" };
    }

    // 检查是否在上游
    const upstreamNodes = this.getUpstreamNodes(nodeId, nodes, edges);
    if (!upstreamNodes.some((n) => n.id === refNodeId)) {
      return { valid: false, error: "只能引用当前分支的上游节点变量" };
    }

    // 检查变量存在
    const outputs = this.getNodeOutputs(refNode);
    if (!outputs.some((v) => v.name === varName)) {
      return { valid: false, error: `变量 ${varName} 不存在于节点 ${refNode.data.name}` };
    }

    return { valid: true };
  }

  /**
   * 检测循环依赖
   */
  static hasCycle(nodes: AppNode[], edges: AppEdge[]): boolean {
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      stack.add(nodeId);

      for (const edge of edges.filter((e) => e.source === nodeId)) {
        if (!visited.has(edge.target)) {
          if (dfs(edge.target)) return true;
        } else if (stack.has(edge.target)) {
          return true;
        }
      }

      stack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id) && dfs(node.id)) return true;
    }

    return false;
  }

  /**
   * 获取变量路径
   */
  static getVariablePath(nodeId: string, varName: string, nodes: AppNode[]): string {
    if (nodeId === "system") return varName;
    const node = nodes.find((n) => n.id === nodeId);
    return node ? `${node.data.name}.${varName}` : `${nodeId}.${varName}`;
  }
}
