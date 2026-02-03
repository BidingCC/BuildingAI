import { blockRegistry } from "../blocks/base/block.registry";
import type { AppEdge, AppNode } from "../types";
import type { AvailableVariable, VariableDefinition } from "../types/variable.types";
import { SYSTEM_VARIABLES } from "../types/variable.types";

export class VariableUtils {
  static getAvailableVariables(
    targetNodeId: string,
    nodes: AppNode[],
    edges: AppEdge[],
    includeSystemVars = true,
  ): AvailableVariable[] {
    const result: AvailableVariable[] = [];

    // 1. 获取当前分支的所有上游节点
    const upstreamNodes = this.getUpstreamNodes(targetNodeId, nodes, edges);

    // 2. 收集每个上游节点的输出变量
    upstreamNodes.forEach((node) => {
      const outputVars = this.getNodeOutputs(node);
      outputVars.forEach((variable) => {
        result.push({
          nodeId: node.id,
          nodeName: node.data.name,
          nodeType: node.data.type,
          variable,
        });
      });
    });

    // 3. 添加系统变量
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
    const block = blockRegistry.get(node.data.type);

    if (!block) {
      console.warn(`Block type "${node.data.type}" not registered`);
      return this.getNodeOutputsFallback(node);
    }

    return block.getOutputVariables(node.data);
  }

  private static getNodeOutputsFallback(node: AppNode): VariableDefinition[] {
    const { vars, outputs } = node.data;

    if (vars && Array.isArray(vars)) {
      return vars;
    }

    if (outputs && Array.isArray(outputs)) {
      return outputs;
    }

    return [];
  }

  static getUpstreamNodes(nodeId: string, nodes: AppNode[], edges: AppEdge[]): AppNode[] {
    const visited = new Set<string>();
    const result: AppNode[] = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const traverse = (currentId: string) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      // 找到所有指向当前节点的边
      const incomingEdges = edges.filter((e) => e.target === currentId);

      incomingEdges.forEach((edge) => {
        const sourceNode = nodeMap.get(edge.source);
        if (sourceNode) {
          result.push(sourceNode);
          traverse(sourceNode.id);
        }
      });
    };

    traverse(nodeId);

    // 拓扑排序（确保按执行顺序）
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

      const incoming = edges.filter((e) => e.target === nodeId);
      incoming.forEach((edge) => {
        if (nodeMap.has(edge.source)) {
          visit(edge.source);
        }
      });

      const node = nodeMap.get(nodeId);
      if (node) sorted.push(node);
    };

    nodes.forEach((n) => visit(n.id));
    return sorted;
  }

  /**
   * 验证变量引用是否有效
   */
  static validateReference(
    nodeId: string,
    refNodeId: string,
    varName: string,
    nodes: AppNode[],
    edges: AppEdge[],
  ): { valid: boolean; error?: string } {
    // 系统变量始终有效
    if (refNodeId === "system") {
      const sysVar = SYSTEM_VARIABLES.find((v) => v.name === varName);
      if (!sysVar) {
        return { valid: false, error: `系统变量 ${varName} 不存在` };
      }
      return { valid: true };
    }

    // 检查引用节点是否存在
    const refNode = nodes.find((n) => n.id === refNodeId);
    if (!refNode) {
      return { valid: false, error: "引用的节点不存在" };
    }

    // 检查是否在当前分支的上游
    const upstreamNodes = this.getUpstreamNodes(nodeId, nodes, edges);
    const canAccess = upstreamNodes.some((n) => n.id === refNodeId);
    if (!canAccess) {
      return { valid: false, error: "只能引用当前分支的上游节点变量" };
    }

    // 检查变量是否存在
    const outputs = this.getNodeOutputs(refNode);
    const varExists = outputs.some((v) => v.name === varName);
    if (!varExists) {
      return { valid: false, error: `变量 ${varName} 不存在于节点 ${refNode.data.name}` };
    }

    return { valid: true };
  }

  /**
   * 批量验证节点的所有变量引用
   */
  static validateNodeReferences(
    node: AppNode,
    nodes: AppNode[],
    edges: AppEdge[],
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const block = blockRegistry.get(node.data.type);

    if (!block) {
      return { valid: true, errors: [] };
    }

    // 获取节点的输入配置
    const inputConfig = block.getInputConfig();

    if (inputConfig.type === "dynamic") {
      const inputs = (node.data as any)[inputConfig.dataField];
      if (Array.isArray(inputs)) {
        inputs.forEach((input: any, index: number) => {
          if (input.value?.mode === "reference" && input.value?.ref) {
            const { nodeId: refNodeId, varName } = input.value.ref;
            if (refNodeId && varName) {
              const result = this.validateReference(node.id, refNodeId, varName, nodes, edges);
              if (!result.valid) {
                errors.push(`输入参数 ${input.definition?.name || index}: ${result.error}`);
              }
            }
          }
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
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

      const outgoing = edges.filter((e) => e.source === nodeId);
      for (const edge of outgoing) {
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
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  }

  /**
   * 获取变量的完整引用路径
   */
  static getVariablePath(nodeId: string, varName: string, nodes: AppNode[]): string {
    if (nodeId === "system") {
      return `sys.${varName}`;
    }

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) {
      return `${nodeId}.${varName}`;
    }

    return `${node.data.name}.${varName}`;
  }

  /**
   * 解析变量引用字符串（如 "{{nodeName.varName}}"）
   */
  static parseVariableRef(
    text: string,
  ): Array<{ nodeId: string; varName: string; fullMatch: string }> {
    const regex = /\{\{([^}]+)\}\}/g;
    const results: Array<{ nodeId: string; varName: string; fullMatch: string }> = [];

    let match;
    while ((match = regex.exec(text)) !== null) {
      const [fullMatch, content] = match;
      const parts = content.trim().split(".");

      if (parts.length >= 2) {
        results.push({
          nodeId: parts[0],
          varName: parts.slice(1).join("."),
          fullMatch,
        });
      }
    }

    return results;
  }
}
