import { useCallback, useState } from "react";

import { useWorkflowStore } from "../store";

export interface ValidationError {
  nodeId: string;
  nodeName: string;
  errors: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  totalNodes: number;
  invalidNodes: number;
}

/**
 * 工作流验证 Hook
 */
export function useWorkflowValidation() {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateWorkflow = useWorkflowStore((state) => state.validateWorkflow);
  const nodesMap = useWorkflowStore((state) => state.nodesMap);

  const validate = useCallback(() => {
    setIsValidating(true);

    // 执行验证
    const result = validateWorkflow();

    // 解析错误信息
    const errorsByNode = new Map<string, ValidationError>();

    result.errors.forEach((errorMsg) => {
      // 从错误信息中提取节点 ID
      // 格式: "节点 NodeName (node_id): error message"
      const match = errorMsg.match(/节点\s+(.+?)\s+\((.+?)\):\s+(.+)/);

      if (match) {
        const [, nodeName, nodeId, error] = match;

        if (!errorsByNode.has(nodeId)) {
          errorsByNode.set(nodeId, {
            nodeId,
            nodeName,
            errors: [],
          });
        }

        errorsByNode.get(nodeId)!.errors.push(error);
      } else {
        // 如果格式不匹配,作为通用错误
        if (!errorsByNode.has("_general")) {
          errorsByNode.set("_general", {
            nodeId: "_general",
            nodeName: "通用错误",
            errors: [],
          });
        }
        errorsByNode.get("_general")!.errors.push(errorMsg);
      }
    });

    const validationResult: ValidationResult = {
      valid: result.valid,
      errors: Array.from(errorsByNode.values()),
      totalNodes: nodesMap.size,
      invalidNodes: errorsByNode.size,
    };

    setValidationResult(validationResult);
    setIsValidating(false);

    return validationResult;
  }, [validateWorkflow, nodesMap]);

  const clearValidation = useCallback(() => {
    setValidationResult(null);
  }, []);

  return {
    validationResult,
    isValidating,
    validate,
    clearValidation,
  };
}
