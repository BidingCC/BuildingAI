import { useI18n } from "@buildingai/i18n";
import {
  type RechargeConfigData,
  type RechargeRule,
  useRechargeConfigQuery,
  useSaveRechargeConfigMutation,
} from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@buildingai/ui/components/ui/input-group";
import { Switch } from "@buildingai/ui/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@buildingai/ui/components/ui/table";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

const UserRechargeIndexPage = () => {
  const { t } = useI18n();
  const [rechargeStatus, setRechargeStatus] = useState(true);
  const [rechargeExplain, setRechargeExplain] = useState("");
  const [rechargeRules, setRechargeRules] = useState<RechargeRule[]>([]);
  const [oldData, setOldData] = useState<RechargeConfigData | undefined>();
  const [hasChanges, setHasChanges] = useState(false);

  const { data, refetch, isLoading } = useRechargeConfigQuery();

  const saveMutation = useSaveRechargeConfigMutation({
    onSuccess: () => {
      toast.success(t("common.action.saveSuccess"));
      refetch();
    },
    onError: (error) => {
      toast.error(t("common.action.saveFailed", { error: error.message }));
    },
  });

  // Initialize data when fetched
  useEffect(() => {
    if (data) {
      setOldData(data);
      setRechargeStatus(data.rechargeStatus);
      setRechargeExplain(data.rechargeExplain || "");
      setRechargeRules(data.rechargeRule.map((item) => ({ ...item })));
    }
  }, [data]);

  // Check for changes
  useEffect(() => {
    if (!oldData) {
      setHasChanges(false);
      return;
    }

    // Check status change
    if (rechargeStatus !== oldData.rechargeStatus) {
      setHasChanges(true);
      return;
    }

    // Check explain change
    if (rechargeExplain !== oldData.rechargeExplain) {
      setHasChanges(true);
      return;
    }

    // Check rules change
    const isEqual = (arr1: RechargeRule[], arr2: RechargeRule[]) => {
      if (arr1.length !== arr2.length) return false;
      return arr1.every((item, index) => {
        const oldItem = arr2[index];
        return (
          item.power === oldItem.power &&
          item.givePower === oldItem.givePower &&
          item.sellPrice === oldItem.sellPrice &&
          item.label === oldItem.label
        );
      });
    };

    if (!isEqual(rechargeRules, oldData.rechargeRule)) {
      setHasChanges(true);
      return;
    }

    setHasChanges(false);
  }, [rechargeStatus, rechargeExplain, rechargeRules, oldData]);

  const handleAddRow = () => {
    const newRow: RechargeRule = {
      power: 0,
      givePower: 0,
      sellPrice: 0,
      label: "",
    };
    setRechargeRules([...rechargeRules, newRow]);
  };

  const handleDeleteRow = (index: number) => {
    setRechargeRules(rechargeRules.filter((_, i) => i !== index));
  };

  const handleUpdateRule = (index: number, field: keyof RechargeRule, value: string | number) => {
    const updated = [...rechargeRules];
    updated[index] = { ...updated[index], [field]: value };
    setRechargeRules(updated);
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        rechargeStatus,
        rechargeExplain,
        rechargeRule: rechargeRules,
      });
    } catch {
      // Error is handled by mutation onError
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-muted-foreground">{t("common.common.loading")}</span>
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-4 pb-6">
        <div className="flex flex-col gap-6">
          {/* Status management */}
          <div>
            <div className="mb-4 flex flex-col gap-1">
              <div className="text-md text-base font-bold">
                {t("operation.recharge.statusTitle")}
              </div>
              <div className="text-muted-foreground text-xs">
                {t("operation.recharge.statusDesc")}
              </div>
            </div>
            <Switch checked={rechargeStatus} onCheckedChange={setRechargeStatus} />
          </div>

          {/* Recharge instructions */}
          {rechargeStatus && (
            <div>
              <div className="mb-4 flex flex-col gap-1">
                <div className="text-md text-base font-bold">
                  {t("operation.recharge.explainTitle")}
                </div>
                <div className="text-muted-foreground text-xs">
                  {t("operation.recharge.explainDesc")}
                </div>
              </div>
              <div className="w-full text-sm">
                <Textarea
                  className="w-full"
                  value={rechargeExplain}
                  onChange={(e) => setRechargeExplain(e.target.value)}
                  rows={6}
                  placeholder={t("operation.recharge.placeholder.explain")}
                />
              </div>
            </div>
          )}

          {/* Recharge rules table */}
          <div className="flex-1">
            <div className="flex w-full items-center justify-between">
              <div className="text-md text-base font-bold">
                {t("operation.recharge.rulesTitle")}
              </div>
              <div className="flex items-center justify-between gap-2 px-4">
                <Button variant="outline" onClick={handleAddRow}>
                  <Plus className="mr-2 size-4" />
                  {t("operation.recharge.addRule")}
                </Button>
              </div>
            </div>
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">
                      {t("operation.recharge.table.index")}
                    </TableHead>
                    <TableHead>{t("operation.recharge.table.power")}</TableHead>
                    <TableHead>{t("operation.recharge.table.givePower")}</TableHead>
                    <TableHead>{t("operation.recharge.table.price")}</TableHead>
                    <TableHead>{t("operation.recharge.table.label")}</TableHead>
                    <TableHead className="w-[80px]">
                      {t("operation.recharge.table.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rechargeRules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground text-center">
                        {t("operation.recharge.emptyRules")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rechargeRules.map((rule, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={rule.power}
                            onChange={(e) =>
                              handleUpdateRule(index, "power", Number(e.target.value))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={rule.givePower}
                            onChange={(e) =>
                              handleUpdateRule(index, "givePower", Number(e.target.value))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <InputGroup>
                              <InputGroupAddon>
                                <InputGroupText>¥</InputGroupText>
                              </InputGroupAddon>
                              <InputGroupInput
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={rule.sellPrice}
                                onChange={(e) =>
                                  handleUpdateRule(index, "sellPrice", Number(e.target.value))
                                }
                              />
                              <InputGroupAddon align="inline-end">
                                <InputGroupText>元</InputGroupText>
                              </InputGroupAddon>
                            </InputGroup>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={rule.label}
                            onChange={(e) => handleUpdateRule(index, "label", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => handleDeleteRow(index)}
                          >
                            <Trash2 className="text-destructive size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saveMutation.isPending}
              className="w-16"
            >
              {saveMutation.isPending ? t("common.action.saving") : t("common.action.save")}
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default UserRechargeIndexPage;
