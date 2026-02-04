import { ChevronRight } from "lucide-react";

import { SettingItem, SettingItemAction, SettingItemGroup } from "../setting-item";

const AboutSetting = () => {
  return (
    <div className="flex flex-col gap-4">
      <SettingItemGroup label="系统信息">
        <SettingItem title="系统版本" description="v26.0.0" />
      </SettingItemGroup>

      <SettingItemGroup label="政策协议">
        <SettingItem title="用户协议">
          <SettingItemAction>
            <ChevronRight />
          </SettingItemAction>
        </SettingItem>
        <SettingItem title="隐私政策">
          <SettingItemAction>
            <ChevronRight />
          </SettingItemAction>
        </SettingItem>
      </SettingItemGroup>

      <SettingItemGroup label="联系我们">
        <SettingItem title="联系客服">
          <SettingItemAction>
            <ChevronRight />
          </SettingItemAction>
        </SettingItem>
      </SettingItemGroup>
    </div>
  );
};

export { AboutSetting };
