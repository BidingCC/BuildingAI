import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@buildingai/ui/components/ui/tooltip";
import { Panel } from "@xyflow/react";
import { CheckCircle, Play, RefreshCw } from "lucide-react";
import { useState } from "react";

import { ValidationResultPanel } from "../_components/validation-result-panel";
import { useWorkflowValidation } from "../hooks/useWorkflowValidation";

export function WorkflowToolbar() {
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const { validationResult, isValidating, validate, clearValidation } = useWorkflowValidation();

  /**
   * 留个口子外部手动触发
   */
  const handleValidate = () => {
    const result = validate();
    console.log(result);
    setShowValidationDialog(true);
  };

  const handleRun = () => {
    const result = validate();
    if (!result.valid) {
      setShowValidationDialog(true);
      return;
    }

    console.log("运行工作流...");
    // TODO: 实际的运行逻辑
  };

  const handleCloseDialog = () => {
    setShowValidationDialog(false);
    clearValidation();
  };

  return (
    <Panel position="bottom-center">
      <div className="flex items-center gap-2 rounded-lg border bg-white p-2 shadow-sm">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleValidate} disabled={isValidating}>
                {isValidating ? (
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 size-4" />
                )}
                验证工作流
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>检查工作流配置是否正确</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                onClick={handleRun}
                disabled={isValidating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Play className="mr-2 size-4" />
                运行工作流
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>验证并运行工作流</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>工作流验证结果</DialogTitle>
            <DialogDescription>检查工作流中所有节点的配置是否正确</DialogDescription>
          </DialogHeader>

          {validationResult && (
            <ValidationResultPanel result={validationResult} onClose={handleCloseDialog} />
          )}
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
