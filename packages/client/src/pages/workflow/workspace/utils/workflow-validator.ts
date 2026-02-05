import { blockRegistry } from "../blocks/base/block.registry";
import type { AppEdge, AppNode } from "../types/node.types";
import type { InputVariable, VariableDefinition } from "../types/variable.types";
import { VariableUtils } from "./variable-utils";

export interface ValidationError {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  errors: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  errorsByNode: ValidationError[];
}

export class WorkflowValidator {
  /**
   * 执行完整的工作流校验
   */
  static validate(nodes: AppNode[], edges: AppEdge[]): ValidationResult {
    const allErrors: string[] = [];
    const errorsByNode = new Map<string, ValidationError>();

    const addError = (nodeId: string, nodeName: string, nodeType: string, error: string) => {
      if (!errorsByNode.has(nodeId)) {
        errorsByNode.set(nodeId, {
          nodeId,
          nodeName,
          nodeType,
          errors: [],
        });
      }
      errorsByNode.get(nodeId)!.errors.push(error);
      allErrors.push(`节点 ${nodeName} (${nodeId}): ${error}`);
    };

    // 1. 全局工作流结构校验
    const structureErrors = this.validateWorkflowStructure(nodes, edges);
    structureErrors.forEach((error) => {
      allErrors.push(error);
      if (!errorsByNode.has("_structure")) {
        errorsByNode.set("_structure", {
          nodeId: "_structure",
          nodeName: "工作流结构",
          nodeType: "structure",
          errors: [],
        });
      }
      errorsByNode.get("_structure")!.errors.push(error);
    });

    // 2. 遍历所有节点进行校验
    nodes.forEach((node) => {
      const nodeId = node.id;
      const nodeName = node.data.name;
      const nodeType = node.data.type;

      // 2.1 获取对应的 Block 实例
      const block = blockRegistry.get(nodeType);
      if (!block) {
        addError(nodeId, nodeName, nodeType, `未注册的节点类型: ${nodeType}`);
        return;
      }

      // 2.2 执行 Block 自身的校验
      const blockValidation = block.validate(node.data);
      if (!blockValidation.valid && blockValidation.errors) {
        blockValidation.errors.forEach((error) => {
          addError(nodeId, nodeName, nodeType, error);
        });
      }

      // 2.3 校验变量引用
      const variableErrors = this.validateNodeVariableReferences(node, nodes, edges);
      variableErrors.forEach((error) => {
        addError(nodeId, nodeName, nodeType, error);
      });

      // 2.4 校验必需输入
      const requiredInputErrors = this.validateRequiredInputs(node);
      requiredInputErrors.forEach((error) => {
        addError(nodeId, nodeName, nodeType, error);
      });

      // 2.5 校验输出变量定义
      const outputErrors = this.validateOutputVariables(node);
      outputErrors.forEach((error) => {
        addError(nodeId, nodeName, nodeType, error);
      });
    });

    // 3. 构建最终结果
    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      errorsByNode: Array.from(errorsByNode.values()),
    };
  }

  /**
   * 全局工作流结构校验
   */
  static validateWorkflowStructure(nodes: AppNode[], edges: AppEdge[]): string[] {
    const errors: string[] = [];

    if (nodes.length === 0) {
      errors.push("工作流至少需要一个节点");
      return errors;
    }

    if (VariableUtils.hasCycle(nodes, edges)) {
      errors.push("工作流存在循环依赖");
    }

    const inputNodes = nodes.filter((n) => n.data.type === "input");
    if (inputNodes.length === 0) {
      errors.push("工作流必须有一个入口节点（开始节点）");
    } else if (inputNodes.length > 1) {
      errors.push("工作流只能有一个入口节点");
    }

    const outputNodes = nodes.filter((n) => n.data.type === "output");
    if (outputNodes.length === 0) {
      errors.push("工作流必须有一个出口节点（结束节点）");
    } else if (outputNodes.length > 1) {
      errors.push("工作流只能有一个出口节点");
    }

    const isolatedNodes = this.findIsolatedNodes(nodes, edges);
    if (isolatedNodes.length > 0) {
      const isolatedNames = isolatedNodes.map((n) => n.data.name).join(", ");
      errors.push(`存在孤立节点（未连接）: ${isolatedNames}`);
    }

    return errors;
  }

  /**
   * 查找孤立节点
   */
  static findIsolatedNodes(nodes: AppNode[], edges: AppEdge[]): AppNode[] {
    const connected = new Set<string>();
    edges.forEach((edge) => {
      connected.add(edge.source);
      connected.add(edge.target);
    });

    return nodes.filter((node) => {
      const isInputNode = node.data.type === "input";
      const isOutputNode = node.data.type === "output";

      if (isInputNode) {
        return !edges.some((e) => e.source === node.id);
      }

      if (isOutputNode) {
        return !edges.some((e) => e.target === node.id);
      }

      return !connected.has(node.id);
    });
  }

  /**
   * 校验节点的变量引用
   */
  static validateNodeVariableReferences(
    node: AppNode,
    nodes: AppNode[],
    edges: AppEdge[],
  ): string[] {
    const errors: string[] = [];
    const inputs = (node.data.inputs as InputVariable[]) || [];

    inputs.forEach((input) => {
      if (input.ref) {
        const validation = VariableUtils.validateReference(
          node.id,
          input.ref.nodeId,
          input.ref.varName,
          nodes,
          edges,
        );

        if (!validation.valid) {
          errors.push(`输入变量 "${input.label || input.name}" 的引用无效: ${validation.error}`);
        }

        const typeError = this.validateVariableTypeCompatibility(input, input.ref, nodes);
        if (typeError) {
          errors.push(`输入变量 "${input.label || input.name}": ${typeError}`);
        }
      }
    });

    return errors;
  }

  /**
   * 校验变量类型兼容性（只支持 number → string）
   */
  static validateVariableTypeCompatibility(
    targetVar: InputVariable,
    ref: { nodeId: string; varName: string },
    nodes: AppNode[],
  ): string | null {
    const refNode = nodes.find((n) => n.id === ref.nodeId);
    if (!refNode) return null;

    const outputs = (refNode.data.outputs as VariableDefinition[]) || [];
    const sourceVar = outputs.find((v) => v.name === ref.varName);
    if (!sourceVar) return null;

    if (targetVar.type === "any" || sourceVar.type === "any") {
      return null;
    }

    if (targetVar.type === sourceVar.type) {
      return null;
    }

    // 只支持 number → string
    if (targetVar.type === "string" && sourceVar.type === "number") {
      return null;
    }

    return `类型不兼容: 期望 ${targetVar.type}，但引用的变量类型为 ${sourceVar.type}`;
  }

  /**
   * 校验必需输入
   */
  static validateRequiredInputs(node: AppNode): string[] {
    const errors: string[] = [];
    const inputs = (node.data.inputs as InputVariable[]) || [];

    inputs.forEach((input) => {
      if (input.required) {
        const hasValue = input.ref || input.value !== undefined;
        if (!hasValue) {
          errors.push(`必填输入变量 "${input.label || input.name}" 未配置`);
        }
      }
    });

    return errors;
  }

  /**
   * 校验输出变量定义
   */
  static validateOutputVariables(node: AppNode): string[] {
    const errors: string[] = [];
    const outputs = (node.data.outputs as VariableDefinition[]) || [];

    const names = outputs.map((v) => v.name);
    const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
    if (duplicates.length > 0) {
      const uniqueDuplicates = [...new Set(duplicates)];
      errors.push(`输出变量名重复: ${uniqueDuplicates.join(", ")}`);
    }

    const invalidNames = outputs.filter((v) => !this.isValidVariableName(v.name));
    if (invalidNames.length > 0) {
      const names = invalidNames.map((v) => v.name).join(", ");
      errors.push(`输出变量名格式无效: ${names}（只能包含字母、数字、下划线）`);
    }

    return errors;
  }

  /**
   * 检查变量名是否有效
   */
  static isValidVariableName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }
}
