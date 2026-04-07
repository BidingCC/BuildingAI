import {
  type AgentBillingMode,
  type AgentCreateTypeKey,
  type AgentTypeConfigItem,
  useAgentConfigQuery,
  useSetAgentConfigMutation,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { Button } from "@buildingai/ui/components/ui/button";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@buildingai/ui/components/ui/input-group";
import { Label } from "@buildingai/ui/components/ui/label";
import { Switch } from "@buildingai/ui/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@buildingai/ui/components/ui/table";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@buildingai/i18n";
import { PageContainer } from "@/layouts/console/_components/page-container";

type AgentTypeOption = {
  key: AgentCreateTypeKey;
  label: string;
};

const AGENT_TYPE_OPTIONS: AgentTypeOption[] = [
  { key: "direct", label: "" },
  { key: "coze", label: "" },
  { key: "dify", label: "" },
];

/** 创建默认的智能体类型配置 */
function buildDefaultTypeConfig(): AgentTypeConfigItem[] {
  return [
    {
      key: "direct",
      enabled: true,
      billingMode: "dynamic",
    },
    {
      key: "coze",
      enabled: true,
      billingMode: "points",
      points: 0,
    },
    {
      key: "dify",
      enabled: true,
      billingMode: "points",
      points: 0,
    },
  ];
}

/** 合并接口返回配置，确保顺序稳定且字段完整 */
function normalizeTypeConfig(items?: AgentTypeConfigItem[]): AgentTypeConfigItem[] {
  const itemMap = new Map((items ?? []).map((item) => [item.key, item]));

  return buildDefaultTypeConfig().map((defaultItem) => {
    const current = itemMap.get(defaultItem.key);
    const billingMode: AgentBillingMode =
      current?.billingMode === "dynamic" || current?.billingMode === "points"
        ? current.billingMode
        : defaultItem.billingMode;

    return {
      key: defaultItem.key,
      enabled: current?.enabled ?? defaultItem.enabled,
      billingMode,
      points:
        billingMode === "points"
          ? Math.max(0, Number(current?.points ?? defaultItem.points ?? 0) || 0)
          : undefined,
    };
  });
}

/** 智能体设置页面 */
const AgentConfigIndexPage = () => {
  const { t } = useI18n();
  const [typeConfig, setTypeConfig] = useState<AgentTypeConfigItem[]>(buildDefaultTypeConfig);
  const [publishWithoutReview, setPublishWithoutReview] = useState(false);
  const { data, isLoading } = useAgentConfigQuery();

  const saveMutation = useSetAgentConfigMutation({
    onSuccess: (response) => {
      setTypeConfig(normalizeTypeConfig(response.createTypes));
      setPublishWithoutReview(response.publishWithoutReview);
      toast.success(t("ai.agent.config.saveSuccess"));
    },
  });

  useEffect(() => {
    if (!data) return;
    setTypeConfig(normalizeTypeConfig(data.createTypes));
    setPublishWithoutReview(data.publishWithoutReview);
  }, [data]);

  const typeConfigMap = useMemo(
    () => new Map(typeConfig.map((item) => [item.key, item])),
    [typeConfig],
  );

  // 全选状态：只有当所有项都启用时才为true
  const isAllSelected = useMemo(() => typeConfig.every((item) => item.enabled), [typeConfig]);

  // 全选/取消全选处理函数
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // 全选：启用所有类型
      setTypeConfig((prev) =>
        prev.map((item) => ({
          ...item,
          enabled: true,
        })),
      );
    } else {
      // 取消全选：保留第一个类型，禁用其他类型
      setTypeConfig((prev) =>
        prev.map((item, index) => ({
          ...item,
          enabled: index === 0, // 只保留第一个类型启用
        })),
      );
    }
  };

  const handleTypeEnabledChange = (key: AgentCreateTypeKey, checked: boolean) => {
    // 如果要禁用，检查是否是最后一个启用的类型
    if (!checked) {
      const enabledCount = typeConfig.filter((item) => item.enabled).length;
      if (enabledCount <= 1) {
        toast.error(t("ai.agent.config.minOneTypeError"));
        return;
      }
    }

    setTypeConfig((prev) =>
      prev.map((item) =>
        item.key === key
          ? {
              ...item,
              enabled: checked,
            }
          : item,
      ),
    );
  };

  const handlePointsChange = (key: AgentCreateTypeKey, value: string) => {
    setTypeConfig((prev) =>
      prev.map((item) =>
        item.key === key
          ? {
              ...item,
              billingMode: item.key === "direct" ? "dynamic" : "points",
              points: Math.max(0, Number(value) || 0),
            }
          : item,
      ),
    );
  };

  const handleSave = () => {
    saveMutation.mutate({
      createTypes: typeConfig.map((item) => ({
        key: item.key,
        enabled: item.enabled,
        billingMode: item.key === "direct" ? "dynamic" : "points",
        points: item.key === "direct" ? undefined : Math.max(0, Number(item.points ?? 0) || 0),
      })),
      publishWithoutReview,
    });
  };

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
      <div className="w-full min-w-0 space-y-6 pb-6 md:w-md">
        <h1 className="text-xl font-semibold">{t("ai.agent.config.meta.title")}</h1>

        <div className="space-y-3">
          <Label>{t("ai.agent.config.publishWithoutReview.label")}</Label>
          <div className="flex items-center gap-2">
            <Switch checked={publishWithoutReview} onCheckedChange={setPublishWithoutReview} />
            <span className="text-muted-foreground text-sm">
              {publishWithoutReview
                ? t("ai.agent.config.publishWithoutReview.enabled")
                : t("ai.agent.config.publishWithoutReview.disabled")}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Label>{t("ai.agent.config.createTypes.label")}</Label>
          <div className="w-full rounded-lg border">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16 text-center">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                        aria-label={t("ai.agent.config.createTypes.selectAll")}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="min-w-48">{t("ai.agent.list.table.type")}</TableHead>
                  <TableHead className="min-w-56">
                    {t("ai.agent.config.createTypes.billingPer1kToken")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {AGENT_TYPE_OPTIONS.map((option) => {
                  const current = typeConfigMap.get(option.key);
                  if (!current) return null;

                  return (
                    <TableRow key={option.key}>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={current.enabled}
                            onCheckedChange={(checked) =>
                              handleTypeEnabledChange(option.key, checked === true)
                            }
                            aria-label={`${t("ai.agent.config.enable")}${t(`ai.agent.createMode.${option.key}`)}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell>{t(`ai.agent.createMode.${option.key}`)}</TableCell>
                      <TableCell>
                        {option.key === "direct" ? (
                          <span>{t("ai.agent.config.billing.dynamic")}</span>
                        ) : (
                          <InputGroup className="max-w-52">
                            <InputGroupInput
                              type="number"
                              min={0}
                              placeholder={t("ai.agent.config.placeholder")}
                              value={current.points ?? 0}
                              onChange={(e) => handlePointsChange(option.key, e.target.value)}
                              disabled={!current.enabled}
                            />
                            <InputGroupAddon align="inline-end">
                              {t("ai.agent.config.billing.points")}
                            </InputGroupAddon>
                          </InputGroup>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-muted-foreground text-sm">
            {t("ai.agent.config.description.billing")}
          </p>
        </div>

        <div className="bg-background sticky bottom-0 z-2 flex justify-start">
          <PermissionGuard permissions="agent-config:set">
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("ai.agent.config.save")}
            </Button>
          </PermissionGuard>
        </div>
      </div>
    </PageContainer>
  );
};

export default AgentConfigIndexPage;
