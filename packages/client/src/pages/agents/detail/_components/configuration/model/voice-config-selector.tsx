import {
  getSpeechConfig,
  type SpeechTranscriptionModelConfig,
  type SpeechTtsModelConfig,
  type SpeechVoiceOption,
} from "@buildingai/ai-sdk/config/audio";
import { useI18n } from "@buildingai/i18n";
import { useAiProvidersQuery } from "@buildingai/services/web";
import type { VoiceConfig } from "@buildingai/types";
import { Label } from "@buildingai/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Slider } from "@buildingai/ui/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { memo, useCallback, useMemo } from "react";

import { ModelSelector as AIModelSelector } from "@/components/ask-assistant-ui/components/model-selector";

interface VoiceConfigSelectorProps {
  value: VoiceConfig | null;
  onChange: (config: VoiceConfig | null) => void;
}

export const VoiceConfigSelector = memo(function VoiceConfigSelector({
  value,
  onChange,
}: VoiceConfigSelectorProps) {
  const { t } = useI18n();
  const stt = value?.stt;
  const tts = value?.tts;

  const { data: voiceProviders = [] } = useAiProvidersQuery({
    supportedModelTypes: ["speech2text", "tts"],
  });
  const { modelIdToProviderId, modelIdToModelKey } = useMemo(() => {
    const byProvider = new Map<string, string>();
    const byKey = new Map<string, string>();
    voiceProviders.forEach((p) => {
      p.models?.forEach((m) => {
        byProvider.set(m.id, p.provider);
        byKey.set(m.id, m.model);
      });
    });
    return { modelIdToProviderId: byProvider, modelIdToModelKey: byKey };
  }, [voiceProviders]);

  const sttModelKey = stt?.modelId ? modelIdToModelKey.get(stt.modelId) : undefined;
  const sttSpeechConfig = useMemo(() => {
    if (!stt?.modelId || !sttModelKey) return null;
    const providerId = modelIdToProviderId.get(stt.modelId);
    return providerId ? getSpeechConfig(providerId) : null;
  }, [stt?.modelId, sttModelKey, modelIdToProviderId]);

  const ttsModelKey = tts?.modelId ? modelIdToModelKey.get(tts.modelId) : undefined;
  const ttsModelConfig = useMemo(() => {
    if (!tts?.modelId || !ttsModelKey) return null;
    const providerId = modelIdToProviderId.get(tts.modelId);
    const config = providerId ? getSpeechConfig(providerId) : null;
    return config?.tts.models.find((m: SpeechTtsModelConfig) => m.modelId === ttsModelKey) ?? null;
  }, [tts?.modelId, ttsModelKey, modelIdToProviderId]);

  const getTtsConfigForModelId = useCallback(
    (modelId: string): SpeechTtsModelConfig | null => {
      const modelKey = modelIdToModelKey.get(modelId);
      const providerId = modelIdToProviderId.get(modelId);
      if (!modelKey || !providerId) return null;
      const config = getSpeechConfig(providerId);
      return config?.tts.models.find((m: SpeechTtsModelConfig) => m.modelId === modelKey) ?? null;
    },
    [modelIdToProviderId, modelIdToModelKey],
  );

  const sttLanguageOptions = useMemo(() => {
    const auto = { value: "auto", label: t("agent.detail.model.auto") };
    const list = sttSpeechConfig?.transcription.models.find(
      (m: SpeechTranscriptionModelConfig) => m.modelId === sttModelKey,
    )?.supportedLanguages;
    if (!list?.length) return [auto];
    return [auto, ...list.map((code: string) => ({ value: code, label: code }))];
  }, [sttSpeechConfig, sttModelKey]);

  const ttsVoiceOptions = useMemo(() => {
    if (!ttsModelConfig?.voices?.length) return [];
    return ttsModelConfig.voices.map((v: SpeechVoiceOption) => ({ value: v.id, label: v.name }));
  }, [ttsModelConfig]);

  const ttsSpeedRange = ttsModelConfig?.speedRange ?? [0.25, 4];
  const ttsDefaultSpeed = ttsModelConfig?.defaultSpeed ?? 1;
  const ttsDefaultVoiceId = ttsModelConfig?.defaultVoiceId;
  const ttsSpeedValue = Math.min(
    ttsSpeedRange[1],
    Math.max(ttsSpeedRange[0], tts?.speed ?? ttsDefaultSpeed),
  );

  const updateStt = useCallback(
    (patch: Partial<NonNullable<VoiceConfig["stt"]>>) => {
      const nextStt = { ...stt, ...patch };
      if (!nextStt.modelId) {
        const next = { ...value };
        delete next.stt;
        onChange(next.tts ? next : null);
      } else {
        onChange({
          ...value,
          stt: { modelId: nextStt.modelId, language: nextStt.language },
        });
      }
    },
    [value, onChange, stt],
  );

  const updateTts = useCallback(
    (patch: Partial<NonNullable<VoiceConfig["tts"]>>) => {
      const nextTts = { ...tts, ...patch };
      if (!nextTts.modelId) {
        const next = { ...value };
        delete next.tts;
        onChange(next.stt ? next : null);
      } else {
        onChange({
          ...value,
          tts: {
            modelId: nextTts.modelId,
            voiceId: nextTts.voiceId,
            speed: nextTts.speed,
          },
        });
      }
    },
    [value, onChange, tts],
  );

  const handleTtsModelSelect = useCallback(
    (id: string) => {
      const cfg = getTtsConfigForModelId(id);
      const defaultVoiceId = cfg?.defaultVoiceId ?? cfg?.voices?.[0]?.id;
      updateTts({
        modelId: id,
        voiceId: defaultVoiceId ?? undefined,
      });
    },
    [getTtsConfigForModelId, updateTts],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t("agent.detail.model.voiceCapability")}</h3>
        <p className="text-muted-foreground text-xs">
          {t("agent.detail.model.voiceCapabilityDesc")}
        </p>
      </div>

      <div className="bg-secondary flex flex-col gap-3 rounded-lg px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-medium">
              {t("agent.detail.model.voiceRecognition")}
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex shrink-0 rounded p-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  aria-label="说明"
                >
                  <HelpCircle className="text-muted-foreground h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {t("agent.detail.model.voiceInputDesc")}
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="w-56 shrink-0">
            <AIModelSelector
              modelType="speech2text"
              value={stt?.modelId ?? ""}
              onSelect={(id) => updateStt({ modelId: id })}
              triggerVariant="button"
              placeholder={t("agent.detail.model.notEnabled")}
              className="w-full min-w-0"
            />
          </div>
        </div>
        {stt?.modelId && sttLanguageOptions.length > 1 && (
          <div className="w-32">
            <Label className="text-muted-foreground mb-1.5 block text-xs">
              {t("agent.detail.model.language")}
            </Label>
            <Select
              value={stt.language || "auto"}
              onValueChange={(v) => updateStt({ language: v === "auto" ? undefined : v })}
            >
              <SelectTrigger className="bg-background h-9 w-full">
                <SelectValue placeholder={t("agent.detail.model.auto")} />
              </SelectTrigger>
              <SelectContent>
                {sttLanguageOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="bg-secondary flex flex-col gap-3 rounded-lg px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-medium">{t("agent.detail.model.voiceSynthesis")}</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex shrink-0 rounded p-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  aria-label="说明"
                >
                  <HelpCircle className="text-muted-foreground h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {t("agent.detail.model.voiceOutputDesc")}
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="w-56 shrink-0">
            <AIModelSelector
              modelType="tts"
              value={tts?.modelId ?? ""}
              onSelect={handleTtsModelSelect}
              triggerVariant="button"
              placeholder={t("agent.detail.model.notEnabled")}
              className="w-full min-w-0"
            />
          </div>
        </div>
        {tts?.modelId && (
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            {ttsVoiceOptions.length > 0 && (
              <div className="min-w-0 sm:w-48">
                <Label className="text-muted-foreground mb-1.5 block text-xs">
                  {t("agent.detail.model.timbre")}
                </Label>
                <Select
                  value={tts.voiceId ?? ttsDefaultVoiceId ?? ttsVoiceOptions[0]?.value ?? ""}
                  onValueChange={(v) => updateTts({ voiceId: v || undefined })}
                >
                  <SelectTrigger className="bg-background h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ttsVoiceOptions.map((opt: { value: string; label: string }) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="min-w-0 flex-1 sm:max-w-48">
              <Label className="text-muted-foreground mb-1.5 block text-xs">
                {t("agent.detail.model.speed")} {ttsSpeedValue.toFixed(1)}x
              </Label>
              <div className="flex h-8 w-full items-center">
                <Slider
                  min={ttsSpeedRange[0]}
                  max={ttsSpeedRange[1]}
                  step={0.1}
                  value={[ttsSpeedValue]}
                  onValueChange={([v]) => updateTts({ speed: v })}
                  className="**:data-[slot=slider-track]:bg-background"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
