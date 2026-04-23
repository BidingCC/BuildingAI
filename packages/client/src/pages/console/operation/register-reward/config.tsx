import {
  useRegisterAwardConfigQuery,
  useSetRegisterAwardConfigMutation,
} from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@buildingai/ui/components/ui/input-group";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

const RegisterRewardConfigPage = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [registerAward, setRegisterAward] = useState("0");
  const [initialConfig, setInitialConfig] = useState<{ status: number; registerAward: number }>({
    status: 0,
    registerAward: 0,
  });
  const [hasChanges, setHasChanges] = useState(false);

  const { data, refetch, isLoading } = useRegisterAwardConfigQuery();

  const setMutation = useSetRegisterAwardConfigMutation({
    onSuccess: () => {
      toast.success("保存成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  useEffect(() => {
    if (!data) return;
    setInitialConfig(data);
    setIsEnabled(data.status === 1);
    setRegisterAward(String(data.registerAward ?? 0));
  }, [data]);

  useEffect(() => {
    const parsed = Number.parseInt(registerAward || "0", 10);
    const safeValue = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    const nextConfig = {
      status: isEnabled ? 1 : 0,
      registerAward: safeValue,
    };
    setHasChanges(
      nextConfig.status !== initialConfig.status ||
        nextConfig.registerAward !== initialConfig.registerAward,
    );
  }, [isEnabled, registerAward, initialConfig]);

  const handleSave = async () => {
    const parsed = Number.parseInt(registerAward || "0", 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error("注册奖励必须是大于等于 0 的整数");
      return;
    }

    await setMutation
      .mutateAsync({
        status: isEnabled ? 1 : 0,
        registerAward: parsed,
      })
      .catch(() => undefined);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-muted-foreground">加载中...</span>
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6 px-3 pb-6">
        <h1 className="text-2xl font-semibold">注册奖励</h1>
        <div className="space-y-4">
          <div>
            <div className="mb-3 max-w-sm">
              <div className="text-[14px] font-medium">是否开启</div>
              <div className="text-muted-foreground text-xs">开启后，新用户注册可获得积分奖励</div>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => {
                setIsEnabled(checked);
              }}
            />
          </div>
          <div className="max-w-sm space-y-2">
            <div className="text-[14px] font-medium">新用户注册赠送</div>
            <InputGroup>
              <InputGroupInput
                type="number"
                min="0"
                step="1"
                value={registerAward}
                disabled={!isEnabled}
                placeholder="填写0表示不赠送"
                onChange={(e) => setRegisterAward(e.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>积分</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            <div className="text-muted-foreground text-xs">填写 0 表示不赠送</div>
          </div>
        </div>
        <div>
          <Button onClick={handleSave} disabled={!hasChanges || setMutation.isPending}>
            {setMutation.isPending ? "保存中..." : "保存设置"}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default RegisterRewardConfigPage;
