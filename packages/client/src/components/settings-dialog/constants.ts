import {
  Bell,
  BookmarkCheck,
  Hammer,
  Info,
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
  | "about"
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
      { id: "profile", name: "账户", icon: UserCircle },
      { id: "wallet", name: "钱包", icon: Wallet },
      { id: "subscribe", name: "订阅管理", icon: BookmarkCheck },
    ],
  },
  {
    label: "常规",
    items: [
      { id: "general", name: "基本设置", icon: Settings },
      { id: "notice", name: "通知", icon: Bell },
      { id: "about", name: "关于", icon: Info },
    ],
  },
  {
    label: "AI设置",
    items: [
      { id: "personalized", name: "个性化", icon: UserStar },
      { id: "tools", name: "工具", icon: Hammer },
    ],
  },
];
