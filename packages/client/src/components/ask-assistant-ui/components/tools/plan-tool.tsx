import {
  Plan,
  PlanAction,
  PlanContent,
  PlanDescription,
  PlanFooter,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from "@buildingai/ui/components/ai-elements/plan";
import { useI18n } from "@buildingai/i18n";
import { Button } from "@buildingai/ui/components/ui/button";
import { FileText } from "lucide-react";
import { memo } from "react";

interface ToolPartData {
  toolCallId: string;
  state: string;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
  approval?: { id?: string; approved?: boolean };
}

export interface ExecutionPlanPayload {
  title: string;
  description: string;
  overview: string;
  keySteps: string[];
}

function isStructuredPlan(output: unknown): output is ExecutionPlanPayload {
  return (
    typeof output === "object" &&
    output !== null &&
    "title" in output &&
    "keySteps" in output &&
    Array.isArray((output as ExecutionPlanPayload).keySteps)
  );
}

function parsePlanContent(planText: string): React.ReactNode {
  const lines = planText.trim().split(/\n+/).filter(Boolean);
  if (lines.length <= 1) return <p className="whitespace-pre-wrap">{planText}</p>;
  const items = lines.map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean);
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h3 className="mb-2 font-semibold">Key Steps</h3>
        <ul className="list-inside list-disc space-y-1">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StructuredPlanContent({ plan }: { plan: ExecutionPlanPayload }) {
  return (
    <div className="space-y-4 text-sm">
      {plan.overview ? (
        <div>
          <h3 className="mb-2 font-semibold">Overview</h3>
          <p>{plan.overview}</p>
        </div>
      ) : null}
      <div>
        <h3 className="mb-2 font-semibold">Key Steps</h3>
        <ul className="list-inside list-disc space-y-1">
          {plan.keySteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export interface PlanToolProps {
  toolPart: ToolPartData;
  planningStatus?: { phase: string; planPreview?: string };
}

export const PlanTool = memo(function PlanTool({ toolPart, planningStatus }: PlanToolProps) {
  const { t } = useI18n();
  const { state, output } = toolPart;
  const structured = isStructuredPlan(output) ? output : null;
  const planText = typeof output === "string" ? output : "";
  const isGenerating = state !== "output-available" && planningStatus?.phase === "generating_plan";
  const hasContent = structured || planText;

  if (state === "output-available" && hasContent) {
    const title = structured?.title ?? t("common.askAssistant.executionPlan");
    const description =
      structured?.description ??
      planningStatus?.planPreview ??
      (planText ? planText.slice(0, 120) + (planText.length > 120 ? "…" : "") : "");

    return (
      <Plan defaultOpen={false}>
        <PlanHeader>
          <div>
            <div className="mb-4 flex items-center gap-2">
              <FileText className="size-4" />
              <PlanTitle>{title}</PlanTitle>
            </div>
            {description ? <PlanDescription>{description}</PlanDescription> : null}
          </div>
          <PlanTrigger />
        </PlanHeader>
        <PlanContent>
          {structured ? <StructuredPlanContent plan={structured} /> : parsePlanContent(planText)}
        </PlanContent>
      </Plan>
    );
  }

  if (isGenerating) {
    return (
      <Plan defaultOpen isStreaming>
        <PlanHeader>
          <div>
            <div className="mb-4 flex items-center gap-2">
              <FileText className="size-4" />
              <PlanTitle>{t("common.askAssistant.executionPlan")}</PlanTitle>
            </div>
            <PlanDescription>{t("common.askAssistant.generatingPlan")}</PlanDescription>
          </div>
          <PlanTrigger />
        </PlanHeader>
        <PlanContent>
          <div className="text-muted-foreground text-sm">{t("common.askAssistant.pleaseWait")}</div>
        </PlanContent>
      </Plan>
    );
  }

  return null;
});
