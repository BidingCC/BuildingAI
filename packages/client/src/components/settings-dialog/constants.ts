import {
  Bell,
  Hammer,
  type LucideIcon,
  Settings,
  UserCircle,
  UserStar,
  Wallet,
} from "lucide-react";

export type SettingsPage =
  | "profile"
  | "general"
  | "wallet"
  | "tools"
  | "subscribe"
  | "notice"
  | "personalized";

export type SettingsNavItem = {
  id: SettingsPage;
  name: string;
  icon: LucideIcon;
};

export type SettingsNavGroup = {
  label: string;
  items: SettingsNavItem[];
};

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    label: "账户",
    items: [
      { id: "profile", name: "个人资料", icon: UserCircle },
      { id: "wallet", name: "我的钱包", icon: Wallet },
      { id: "subscribe", name: "订阅管理", icon: UserCircle },
    ],
  },
  {
    label: "常规",
    items: [
      { id: "general", name: "基本设置", icon: Settings },
      { id: "tools", name: "工具管理", icon: Hammer },
      { id: "notice", name: "通知管理", icon: Bell },
    ],
  },
  {
    label: "AI设置",
    items: [{ id: "personalized", name: "个性化", icon: UserStar }],
  },
];
