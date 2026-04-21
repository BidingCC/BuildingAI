import type { Pm2LogRotateConfig, Pm2LogRotatePreset } from "@buildingai/services/console";
import {
  useApplyPm2LogRotateConfigMutation,
  usePm2LogRotateConfigQuery,
  useSetPm2LogRotateConfigMutation,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@buildingai/ui/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@buildingai/ui/components/ui/field";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Separator } from "@buildingai/ui/components/ui/separator";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, DatabaseZap, Loader2, RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

const DEFAULT_CONFIG: Pm2LogRotateConfig = {
  enabled: true,
  maxSize: "50M",
  retain: 14,
  compress: true,
  preset: "daily",
  rotateInterval: "0 0 * * *",
  timezone: "Asia/Shanghai",
  archiveByMonth: true,
};

const PRESET_OPTIONS: Array<{ value: Pm2LogRotatePreset; label: string; cron: string }> = [
  { value: "hourly", label: "每小时", cron: "0 * * * *" },
  { value: "every-6-hours", label: "每 6 小时", cron: "0 */6 * * *" },
  { value: "daily", label: "每天 0 点", cron: "0 0 * * *" },
  { value: "weekly", label: "每周日 0 点", cron: "0 0 * * 0" },
  { value: "monthly", label: "每月 1 日 0 点", cron: "0 0 1 * *" },
  { value: "custom", label: "自定义", cron: "" },
];

const getPresetCron = (preset: Pm2LogRotatePreset, fallback: string) =>
  PRESET_OPTIONS.find((item) => item.value === preset)?.cron || fallback;

const getPresetLabel = (preset: Pm2LogRotatePreset) =>
  PRESET_OPTIONS.find((item) => item.value === preset)?.label || "自定义";

const normalizeConfig = (config?: Partial<Pm2LogRotateConfig>): Pm2LogRotateConfig => {
  const merged = { ...DEFAULT_CONFIG, ...config };
  return {
    enabled: merged.enabled,
    maxSize: merged.maxSize,
    retain: merged.retain,
    compress: merged.compress,
    preset: merged.preset,
    rotateInterval:
      merged.preset !== "custom"
        ? getPresetCron(merged.preset, DEFAULT_CONFIG.rotateInterval)
        : merged.rotateInterval || DEFAULT_CONFIG.rotateInterval,
    timezone: merged.timezone,
    archiveByMonth: merged.archiveByMonth,
  };
};

const SystemPm2LogRotateIndexPage = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = usePm2LogRotateConfigQuery();

  const [form, setForm] = useState<Pm2LogRotateConfig>(DEFAULT_CONFIG);

  const savedConfig = useMemo(() => normalizeConfig(data), [data]);

  useEffect(() => {
    if (!data) return;
    setForm(savedConfig);
  }, [data, savedConfig]);

  const refreshQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ["pm2", "log-rotate"] });
  };

  const saveMutation = useSetPm2LogRotateConfigMutation({
    onSuccess: (result) => {
      toast.success(result.applied ? "日志切割配置已保存并应用" : "日志切割已关闭");
      refreshQueries();
    },
    onError: (e) => {
      toast.error(`保存失败: ${e.message}`);
    },
  });

  const applyMutation = useApplyPm2LogRotateConfigMutation({
    onSuccess: () => {
      toast.success("已重新应用当前配置");
      refreshQueries();
    },
    onError: (e) => {
      toast.error(`应用失败: ${e.message}`);
    },
  });

  const updateForm = <K extends keyof Pm2LogRotateConfig>(key: K, value: Pm2LogRotateConfig[K]) => {
    setForm((prev) => {
      if (key === "preset") {
        const preset = value as Pm2LogRotatePreset;
        return {
          ...prev,
          preset,
          rotateInterval:
            preset === "custom" ? prev.rotateInterval : getPresetCron(preset, prev.rotateInterval),
        };
      }

      return {
        ...prev,
        [key]: value,
      };
    });
  };

  const validate = () => {
    if (!/^[1-9]\d*(K|M|G)$/i.test(form.maxSize.trim())) {
      toast.error("单文件最大大小格式应为 50M、1G 这类格式");
      return false;
    }

    if (!Number.isInteger(form.retain) || form.retain < 1 || form.retain > 365) {
      toast.error("保留份数必须是 1 到 365 之间的整数");
      return false;
    }

    if (
      !form.rotateInterval
        .trim()
        .split(/\s+/)
        .every((part) => /^[\d*,/-]+$/.test(part))
    ) {
      toast.error("切割时间表达式格式不正确");
      return false;
    }

    if (form.rotateInterval.trim().split(/\s+/).length !== 5) {
      toast.error("切割时间表达式需要 5 段");
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (!validate()) return;

    saveMutation.mutate({
      ...form,
      maxSize: form.maxSize.trim().toUpperCase(),
      rotateInterval: form.rotateInterval.trim(),
      timezone: form.timezone.trim(),
    });
  };

  const handleReset = () => {
    setForm(savedConfig);
    toast.success("已重置为当前保存的配置");
  };

  const isBusy = saveMutation.isPending || applyMutation.isPending;

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center py-12">
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PermissionGuard permissions="pm2:get-log-rotate-config">
        <div className="space-y-6 px-3">
          <div className="flex flex-col gap-4 rounded-lg border bg-[linear-gradient(135deg,hsl(var(--muted))_0%,hsl(var(--background))_58%,hsl(var(--accent))_100%)] p-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DatabaseZap className="text-primary size-5" />
                <h1 className="text-2xl font-semibold">PM2 日志切割</h1>
              </div>
              <p className="text-muted-foreground max-w-2xl text-sm">
                当前日志保留在 logs/pm2，切割后的历史文件会归档到 logs/pm2/YYYY-MM
              </p>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>切割策略</CardTitle>
                <CardDescription>保存后会立即写入 PM2 logrotate 配置</CardDescription>
                <CardAction>
                  <Switch
                    checked={form.enabled}
                    onCheckedChange={(value) => updateForm("enabled", value)}
                  />
                </CardAction>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                    <Field>
                      <FieldLabel>切割周期</FieldLabel>
                      <Select
                        value={form.preset}
                        onValueChange={(value) => updateForm("preset", value as Pm2LogRotatePreset)}
                        disabled={!form.enabled}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRESET_OPTIONS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel>自定义 cron</FieldLabel>
                      <Input
                        value={form.rotateInterval}
                        disabled={!form.enabled || form.preset !== "custom"}
                        onChange={(event) => updateForm("rotateInterval", event.target.value)}
                        placeholder="0 0 * * *"
                      />
                      <FieldDescription>分钟 小时 日期 月份 星期</FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel>单文件最大大小</FieldLabel>
                      <Input
                        value={form.maxSize}
                        disabled={!form.enabled}
                        onChange={(event) => updateForm("maxSize", event.target.value)}
                        placeholder="50M"
                      />
                    </Field>

                    <Field>
                      <FieldLabel>保留份数</FieldLabel>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={form.retain}
                        disabled={!form.enabled}
                        onChange={(event) => updateForm("retain", Number(event.target.value))}
                      />
                    </Field>

                    <Field>
                      <FieldLabel>时区</FieldLabel>
                      <Input
                        value={form.timezone}
                        disabled={!form.enabled}
                        onChange={(event) => updateForm("timezone", event.target.value)}
                        placeholder="Asia/Shanghai"
                      />
                    </Field>

                    <Field>
                      <FieldLabel>压缩历史日志</FieldLabel>
                      <div className="flex h-9 items-center justify-between px-3">
                        <Switch
                          checked={form.compress}
                          disabled={!form.enabled}
                          onCheckedChange={(value) => updateForm("compress", value)}
                        />
                      </div>
                      <FieldDescription>启用后历史切割文件会保存为 gzip</FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel>按月份归档</FieldLabel>
                      <div className="flex h-9 items-center justify-between px-3">
                        <Switch
                          checked={form.archiveByMonth}
                          disabled={!form.enabled}
                          onCheckedChange={(value) => updateForm("archiveByMonth", value)}
                        />
                      </div>
                      <FieldDescription>历史日志移动到 logs/pm2/YYYY-MM 文件夹</FieldDescription>
                    </Field>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <PermissionGuard permissions="pm2:set-log-rotate-config">
                      <Button onClick={handleSave} disabled={isBusy}>
                        {saveMutation.isPending ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 size-4" />
                        )}
                        保存并应用
                      </Button>
                    </PermissionGuard>

                    <PermissionGuard permissions="pm2:apply-log-rotate-config">
                      <Button
                        variant="outline"
                        onClick={() => applyMutation.mutate()}
                        disabled={isBusy}
                      >
                        {applyMutation.isPending ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-2 size-4" />
                        )}
                        重新应用
                      </Button>
                    </PermissionGuard>

                    <Button variant="ghost" onClick={handleReset} disabled={isBusy || !data}>
                      重置
                    </Button>
                  </div>
                </FieldGroup>
              </CardContent>
            </Card>

            <Card className="rounded-lg" size="sm">
              <CardHeader>
                <CardTitle>当前策略</CardTitle>
                <CardDescription>保存后的 PM2 logrotate 配置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-md">
                    {savedConfig.enabled ? (
                      <CheckCircle2 className="size-5" />
                    ) : (
                      <Clock3 className="size-5" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{savedConfig.enabled ? "已启用" : "已关闭"}</div>
                    <div className="text-muted-foreground text-sm">
                      {getPresetLabel(savedConfig.preset)}
                    </div>
                  </div>
                </div>
                <Separator />
                <dl className="grid grid-cols-[96px_1fr] gap-x-4 gap-y-3 text-sm">
                  <dt className="text-muted-foreground">cron</dt>
                  <dd className="font-mono">{savedConfig.rotateInterval}</dd>
                  <dt className="text-muted-foreground">大小</dt>
                  <dd>{savedConfig.maxSize}</dd>
                  <dt className="text-muted-foreground">保留</dt>
                  <dd>{savedConfig.retain} 份</dd>
                  <dt className="text-muted-foreground">压缩</dt>
                  <dd>{savedConfig.compress ? "开启" : "关闭"}</dd>
                  <dt className="text-muted-foreground">时区</dt>
                  <dd>{savedConfig.timezone}</dd>
                  <dt className="text-muted-foreground">归档</dt>
                  <dd>{savedConfig.archiveByMonth ? "按月份文件夹" : "保留在根目录"}</dd>
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </PermissionGuard>
    </PageContainer>
  );
};

export default SystemPm2LogRotateIndexPage;
