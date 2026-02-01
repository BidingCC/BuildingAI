import { Alert, AlertDescription, AlertTitle } from "@buildingai/ui/components/ui/alert";
import { Button } from "@buildingai/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@buildingai/ui/components/ui/card";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, XCircle } from "lucide-react";
import { useState } from "react";

import type { ValidationError, ValidationResult } from "../hooks/useWorkflowValidation";
import { useWorkflowStore } from "../store";

interface ValidationResultPanelProps {
  result: ValidationResult;
  onClose?: () => void;
}

export function ValidationResultPanel({ result, onClose }: ValidationResultPanelProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const selectNode = useWorkflowStore((state) => state.selectNode);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleNodeClick = (nodeId: string) => {
    if (nodeId !== "_general") {
      selectNode(nodeId);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {result.valid ? (
              <>
                <CheckCircle2 className="size-5 text-green-500" />
                <span>验证通过</span>
              </>
            ) : (
              <>
                <XCircle className="size-5 text-red-500" />
                <span>验证失败</span>
              </>
            )}
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              关闭
            </Button>
          )}
        </div>

        <div className="text-muted-foreground mt-2 text-sm">
          总节点数: {result.totalNodes} | 错误节点: {result.invalidNodes}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {result.valid ? (
          <Alert className="m-4 border-green-200 bg-green-50">
            <CheckCircle2 className="size-4 text-green-600" />
            <AlertTitle className="text-green-800">工作流配置正确</AlertTitle>
            <AlertDescription className="text-green-700">
              所有节点配置均符合要求,可以运行工作流
            </AlertDescription>
          </Alert>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 p-4">
              {result.errors.map((error) => (
                <ErrorNodeCard
                  key={error.nodeId}
                  error={error}
                  isExpanded={expandedNodes.has(error.nodeId)}
                  onToggle={() => toggleNode(error.nodeId)}
                  onClick={() => handleNodeClick(error.nodeId)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

interface ErrorNodeCardProps {
  error: ValidationError;
  isExpanded: boolean;
  onToggle: () => void;
  onClick: () => void;
}

function ErrorNodeCard({ error, isExpanded, onToggle, onClick }: ErrorNodeCardProps) {
  return (
    <Card className="cursor-pointer transition-colors hover:bg-gray-50" onClick={onClick}>
      <CardHeader className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-red-500" />
            <span className="font-medium">{error.nodeName}</span>
            <span className="text-muted-foreground text-xs">({error.nodeId})</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="border-t p-3">
          <div className="space-y-1">
            {error.errors.map((errorMsg, index) => (
              <div key={index} className="text-sm text-red-600">
                • {errorMsg}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
