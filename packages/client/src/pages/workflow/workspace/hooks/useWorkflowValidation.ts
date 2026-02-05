import { useCallback, useState } from "react";

import { useWorkflowStore } from "../store";
import { WorkflowValidator } from "../utils/workflow-validator";

export interface ValidationError {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  errors: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  totalNodes: number;
  invalidNodes: number;
}

export function useWorkflowValidation() {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);

  const validate = useCallback(() => {
    setIsValidating(true);

    const result = WorkflowValidator.validate(nodes, edges);

    // 转换为 UI 需要的格式
    const uiResult: ValidationResult = {
      valid: result.valid,
      errors: result.errorsByNode,
      totalNodes: nodes.length,
      invalidNodes: result.errorsByNode.length,
    };

    setValidationResult(uiResult);
    setIsValidating(false);

    return uiResult;
  }, [nodes, edges]);

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
