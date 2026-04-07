import { useI18n } from "@buildingai/i18n";
import { Button } from "@buildingai/ui/components/ui/button";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Field, FieldGroup } from "@buildingai/ui/components/ui/field";
import { Label } from "@buildingai/ui/components/ui/label";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { Settings2 } from "lucide-react";
import { memo, useCallback, useState } from "react";

import { ModelSelector } from "@/components/ask-assistant-ui";

export const AutoFollowUp = memo(
  ({
    value,
    onChange,
    titleModelId,
    onTitleModelChange,
  }: {
    value: { enabled: boolean; customRuleEnabled: boolean; customRule: string };
    onChange: (value: { enabled: boolean; customRuleEnabled: boolean; customRule: string }) => void;
    titleModelId?: string;
    onTitleModelChange: (modelId: string) => void;
  }) => {
    const { t } = useI18n();
    const autoQuestions = value;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [draftModelId, setDraftModelId] = useState(() => titleModelId ?? "");

    const openDialog = useCallback(() => {
      setDraftModelId(titleModelId ?? "");
      setDialogOpen(true);
    }, [titleModelId]);

    const closeDialog = useCallback(
      (nextOpen: boolean) => {
        setDialogOpen(nextOpen);
        if (nextOpen) return;

        const nextModelId = draftModelId.trim();
        if (nextModelId) {
          onTitleModelChange(nextModelId);
          return;
        }

        if (autoQuestions.enabled) {
          onTitleModelChange("");
          onChange({ ...autoQuestions, enabled: false });
        }
      },
      [autoQuestions, draftModelId, onChange, onTitleModelChange],
    );

    const saveTitleModel = useCallback(() => {
      const nextModelId = draftModelId.trim();
      if (!nextModelId) return;

      onTitleModelChange(nextModelId);
      setDialogOpen(false);
    }, [draftModelId, onTitleModelChange]);

    const handleEnabledChange = useCallback(
      (enabled: boolean) => {
        if (!enabled) {
          setDialogOpen(false);
          onChange({ ...autoQuestions, enabled: false });
          return;
        }

        onChange({ ...autoQuestions, enabled });
        if (!titleModelId?.trim()) {
          setDraftModelId("");
          setDialogOpen(true);
        }
      },
      [autoQuestions, onChange, titleModelId],
    );

    const handleCustomRuleEnabledChange = useCallback(
      (customRuleEnabled: boolean) => {
        onChange({ ...autoQuestions, customRuleEnabled });
      },
      [autoQuestions, onChange],
    );

    const handleCustomRuleChange = useCallback(
      (customRule: string) => {
        onChange({ ...autoQuestions, customRule });
      },
      [autoQuestions, onChange],
    );

    return (
      <>
        <div className="bg-secondary rounded-lg px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-sm font-medium">{t("agent.detail.interface.autoFollowUp")}</h3>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {t("agent.detail.interface.autoFollowUpDesc")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {autoQuestions.enabled && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={openDialog}
                      className="hover:bg-primary/10 hover:text-primary"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-background text-xs">
                      {t("agent.detail.interface.titleModel")}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
              <Switch checked={autoQuestions.enabled} onCheckedChange={handleEnabledChange} />
            </div>
          </div>

          {autoQuestions.enabled && (
            <div className="mt-3 space-y-3">
              <FieldGroup className="mb-1">
                <Field orientation="horizontal" className="items-center gap-2">
                  <Checkbox
                    id="custom-rule-checkbox"
                    checked={autoQuestions.customRuleEnabled}
                    onCheckedChange={(v) => handleCustomRuleEnabledChange(!!v)}
                  />
                  <Label htmlFor="custom-rule-checkbox">
                    {t("agent.detail.interface.addCustomRule")}
                  </Label>
                </Field>
              </FieldGroup>
              {autoQuestions.customRuleEnabled && (
                <Textarea
                  value={autoQuestions.customRule ?? ""}
                  onChange={(e) => handleCustomRuleChange(e.target.value)}
                  placeholder={t("agent.detail.interface.customRulePlaceholder")}
                  className="bg-background mt-3 resize-none"
                  rows={4}
                />
              )}
            </div>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("agent.detail.interface.titleModel")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t("agent.detail.model.selectModel")}</Label>
                <ModelSelector
                  modelType="llm"
                  value={draftModelId || undefined}
                  onSelect={setDraftModelId}
                  placeholder={t("agent.detail.model.notEnabled")}
                  triggerVariant="button"
                />
                <p className="text-muted-foreground text-xs">
                  {t("agent.detail.interface.titleModelSameConfig")}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => closeDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="button" onClick={saveTitleModel} disabled={!draftModelId.trim()}>
                {t("common.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  },
);

AutoFollowUp.displayName = "AutoFollowUp";
