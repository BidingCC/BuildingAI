import {
  type LoginAwardItem,
  useLoginAwardConfigQuery,
  useSetLoginAwardConfigMutation,
} from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@buildingai/ui/components/ui/input-group";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Table, TableBody, TableCell, TableRow } from "@buildingai/ui/components/ui/table";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

type LoginAwardFormItem = {
  id: string;
  name: string;
  level: string;
  award: string;
};

const LoginRewardConfigPage = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loginAward, setLoginAward] = useState<LoginAwardFormItem[]>([]);
  const [initialConfig, setInitialConfig] = useState<{
    status: number;
    loginAward: LoginAwardFormItem[];
  }>({
    status: 0,
    loginAward: [],
  });
  const [hasChanges, setHasChanges] = useState(false);

  const { data, refetch, isLoading } = useLoginAwardConfigQuery();

  const setMutation = useSetLoginAwardConfigMutation({
    onSuccess: () => {
      toast.success("保存成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  const transformItem = (item: LoginAwardItem): LoginAwardFormItem => ({
    id: String(item.id),
    name: item.name,
    level: String(item.level),
    award: String(item.award ?? 0),
  });

  useEffect(() => {
    if (!data) return;
    const normalized = data.loginAward.map(transformItem);
    setInitialConfig({
      status: data.status,
      loginAward: normalized,
    });
    setIsEnabled(data.status === 1);
    setLoginAward(normalized);
  }, [data]);

  useEffect(() => {
    const nextStatus = isEnabled ? 1 : 0;
    const statusChanged = nextStatus !== initialConfig.status;
    const listChanged =
      loginAward.length !== initialConfig.loginAward.length ||
      loginAward.some((item, index) => {
        const initialItem = initialConfig.loginAward[index];
        if (!initialItem) return true;
        return (
          item.id !== initialItem.id ||
          item.name !== initialItem.name ||
          item.level !== initialItem.level ||
          item.award !== initialItem.award
        );
      });
    setHasChanges(statusChanged || listChanged);
  }, [isEnabled, loginAward, initialConfig]);

  const handleAwardChange = (index: number, value: string) => {
    setLoginAward((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], award: value };
      return next;
    });
  };

  const handleSave = async () => {
    const payload = loginAward.map((item) => {
      const parsed = Number.parseInt(item.award || "0", 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        throw new Error(`${item.name} 的登录赠送积分必须是大于等于 0 的整数`);
      }
      return {
        id: item.id,
        name: item.name,
        level: item.level,
        award: parsed,
      };
    });

    try {
      await setMutation.mutateAsync({
        status: isEnabled ? 1 : 0,
        loginAward: payload,
      });
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    }
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
        <h1 className="text-2xl font-semibold">登录奖励</h1>
        <div className="space-y-4">
          <div>
            <div className="mb-3 max-w-sm">
              <div className="text-[14px] font-medium">是否开启</div>
              <div className="text-muted-foreground text-xs">
                开启后，用户每日登录可获得积分奖励
              </div>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => {
                setIsEnabled(checked);
                if (!checked) return;
                setLoginAward((prev) =>
                  prev.map((item) => {
                    const parsed = Number.parseInt(item.award || "0", 10);
                    if (Number.isNaN(parsed) || parsed <= 0) {
                      return { ...item, award: "50" };
                    }
                    return item;
                  }),
                );
              }}
            />
          </div>
          <div className="max-w-3xl space-y-2">
            <div className="text-[14px] font-medium">每日登录赠送</div>
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">用户范围</TableCell>
                    <TableCell className="font-medium">登录赠送积分</TableCell>
                  </TableRow>
                  {loginAward.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="w-[240px]">
                        <InputGroup>
                          <InputGroupInput
                            type="number"
                            min="0"
                            step="1"
                            value={item.award}
                            disabled={!isEnabled}
                            placeholder="填写0表示不赠送"
                            onChange={(e) => handleAwardChange(index, e.target.value)}
                          />
                          <InputGroupAddon align="inline-end">
                            <InputGroupText>积分</InputGroupText>
                          </InputGroupAddon>
                        </InputGroup>
                      </TableCell>
                    </TableRow>
                  ))}
                  {loginAward.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground text-center">
                        暂无会员等级数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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

export default LoginRewardConfigPage;
